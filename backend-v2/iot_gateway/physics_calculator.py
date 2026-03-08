"""
Physics-Based Water Quality Calculator
================================
Calculates derived water quality parameters using established physics/chemistry formulas:
  1. NH₃ (un-ionized ammonia) - from TAN, pH, temperature
  2. DO Saturation - theoretical maximum oxygen
  3. Temperature-corrected parameters
  4. Water quality indexes

These formulas provide accurate predictions without ML models.
"""

import numpy as np
from datetime import datetime
from typing import Dict, Tuple, Optional


class PhysicsCalculator:
    """Physics-based calculations for water quality parameters"""
    
    # Constants for NH₃ calculation (Emerson et al., 1975)
    AMMONIA_pKa_CONST = 0.09018
    AMMONIA_pKa_TEMP = 2729.92
    AMMONIA_SALINITY_CORRECTION = 0.00314
    
    # Constants for DO Saturation (Benson & Krause, 1984)
    DO_SAT_A0 = -139.34411
    DO_SAT_A1 = 1.575701e5
    DO_SAT_A2 = -6.642308e7
    DO_SAT_A3 = 1.2438e10
    DO_SAT_A4 = -8.621949e11
    
    @staticmethod
    def calculate_nh3(
        tan_mg_l: float,
        temp_c: float,
        ph: float,
        salinity_ppt: float = 0.0
    ) -> Dict[str, float]:
        """
        Calculate un-ionized ammonia (NH₃) from total ammonia nitrogen (TAN).
        
        NH₃ is the toxic form of ammonia. It depends on:
        - TAN concentration
        - Temperature (Warmer = more NH₃)
        - pH (Higher pH = more NH₃)
        - Salinity (Slight correction)
        
        Parameters:
            tan_mg_l: Total Ammonia Nitrogen in mg/L
            temp_c: Water temperature in °C
            ph: pH value (0-14)
            salinity_ppt: Salinity in ppt (default 0 for freshwater)
        
        Returns:
            dict with keys:
            - nh3_mg_l: Un-ionized ammonia concentration
            - nh3_fraction: Fraction of TAN that is NH₃ (0-1)
            - nh4_mg_l: Ionized ammonia (NH₄⁺)
            - status: "safe" if < 0.05, "warning" if < 0.1, "critical" if >= 0.1
        """
        T_kelvin = temp_c + 273.15
        
        # Calculate pKa (temperature-dependent)
        pKa = PhysicsCalculator.AMMONIA_pKa_CONST + PhysicsCalculator.AMMONIA_pKa_TEMP / T_kelvin
        
        # Salinity correction
        pKa_corrected = pKa - PhysicsCalculator.AMMONIA_SALINITY_CORRECTION * salinity_ppt
        
        # Fraction of TAN as NH₃ using Henderson-Hasselbalch
        fraction_nh3 = 1.0 / (1.0 + 10 ** (pKa_corrected - ph))
        
        # Calculate concentrations
        nh3_mg_l = tan_mg_l * fraction_nh3
        nh4_mg_l = tan_mg_l * (1 - fraction_nh3)
        
        # Status determination
        if nh3_mg_l < 0.05:
            status = "safe"
        elif nh3_mg_l < 0.1:
            status = "warning"
        else:
            status = "critical"
        
        return {
            "nh3_mg_l": round(nh3_mg_l, 6),
            "nh3_fraction": round(fraction_nh3, 4),
            "nh4_mg_l": round(nh4_mg_l, 6),
            "pka": round(pKa_corrected, 4),
            "status": status,
            "optimal_range": "< 0.05 mg/L"
        }
    
    @staticmethod
    def calculate_do_saturation(
        temp_c: float,
        salinity_ppt: float = 0.0,
        pressure_atm: float = 1.0
    ) -> Dict[str, float]:
        """
        Calculate theoretical DO saturation (maximum dissolving oxygen).
        
        Uses Benson & Krause (1984) equation - industry standard.
        
        Parameters:
            temp_c: Water temperature in °C
            salinity_ppt: Salinity in ppt (0 = freshwater)
            pressure_atm: Atmospheric pressure (default 1.0 = sea level)
        
        Returns:
            dict with keys:
            - do_sat_fresh: DO saturation in freshwater (no salinity)
            - do_sat_saline: DO saturation with salinity correction
            - do_sat_final: Final DO saturation with pressure correction
        """
        T = temp_c + 273.15
        
        # Benson & Krause freshwater saturation
        ln_do_sat = (
            PhysicsCalculator.DO_SAT_A0
            + PhysicsCalculator.DO_SAT_A1 / T
            + PhysicsCalculator.DO_SAT_A2 / (T ** 2)
            + PhysicsCalculator.DO_SAT_A3 / (T ** 3)
            + PhysicsCalculator.DO_SAT_A4 / (T ** 4)
        )
        
        do_sat_fresh = np.exp(ln_do_sat)
        
        # Salinity correction
        S = salinity_ppt
        if S > 0:
            salinity_correction = np.exp(-S * (0.017674 - 10.754/T + 2140.7/(T**2)))
        else:
            salinity_correction = 1.0
        
        do_sat_saline = do_sat_fresh * salinity_correction
        
        # Pressure correction
        do_sat_final = do_sat_saline * pressure_atm
        
        return {
            "do_sat_fresh": round(do_sat_fresh, 3),
            "do_sat_saline": round(do_sat_saline, 3),
            "do_sat_final": round(do_sat_final, 3),
            "optimal_range": "> 5.0 mg/L"
        }
    
    @staticmethod
    def calculate_do_saturation_percent(
        do_measured_mg_l: float,
        temp_c: float,
        salinity_ppt: float = 0.0
    ) -> Dict[str, float]:
        """
        Calculate DO saturation percentage.
        
        Parameters:
            do_measured_mg_l: Measured dissolved oxygen in mg/L
            temp_c: Water temperature in °C
            salinity_ppt: Salinity in ppt
        
        Returns:
            dict with DO saturation percentage and status
        """
        sat_info = PhysicsCalculator.calculate_do_saturation(temp_c, salinity_ppt)
        do_sat = sat_info["do_sat_final"]
        
        saturation_pct = (do_measured_mg_l / do_sat * 100) if do_sat > 0 else 0
        
        if saturation_pct < 50:
            status = "critical"
        elif saturation_pct < 80:
            status = "warning"
        elif saturation_pct > 120:
            status = "supersaturated"
        else:
            status = "optimal"
        
        return {
            "saturation_pct": round(saturation_pct, 2),
            "do_sat_mg_l": do_sat,
            "do_measured_mg_l": do_measured_mg_l,
            "status": status,
            "optimal_range": "80-120%"
        }
    
    @staticmethod
    def calculate_conductivity_to_tds(
        conductivity_us_cm: float,
        temp_c: float,
        conversion_factor: float = 0.5
    ) -> Dict[str, float]:
        """
        Convert electrical conductivity to TDS (Total Dissolved Solids).
        
        Formula: TDS (ppm) ≈ Conductivity (µS/cm) × Conversion Factor × Temperature Correction
        
        Common conversion factors:
        - 0.5: Standard (for general water)
        - 0.55: Estuarine/Brackish water
        - 0.65: Seawater
        
        Parameters:
            conductivity_us_cm: Conductivity in µS/cm
            temp_c: Water temperature in °C
            conversion_factor: Conversion factor (default 0.5)
        
        Returns:
            dict with TDS estimate and quality assessment
        """
        # Temperature correction factor (approximately)
        temp_correction = 1 + 0.02 * (temp_c - 25)
        
        # Calculate TDS
        tds_ppm = conductivity_us_cm * conversion_factor * temp_correction
        
        # Assess water quality
        if tds_ppm < 500:
            quality = "excellent"
        elif tds_ppm < 1000:
            quality = "good"
        elif tds_ppm < 2000:
            quality = "fair"
        else:
            quality = "poor"
        
        return {
            "tds_ppm": round(tds_ppm, 2),
            "quality": quality,
            "conductivity_us_cm": conductivity_us_cm,
            "conversion_factor": conversion_factor,
            "temperature_correction": round(temp_correction, 3)
        }
    
    @staticmethod
    def calculate_ph_status(
        ph: float,
        tank_type: str = "brackish"
    ) -> Dict[str, str]:
        """
        Assess pH status for shrimp farming.
        
        Parameters:
            ph: pH value
            tank_type: "freshwater" | "brackish" | "saltwater"
        
        Returns:
            dict with pH status and recommendations
        """
        if tank_type == "brackish":
            optimal_min, optimal_max = 7.5, 8.5
        elif tank_type == "saltwater":
            optimal_min, optimal_max = 7.8, 8.3
        else:  # freshwater
            optimal_min, optimal_max = 6.5, 7.5
        
        if optimal_min <= ph <= optimal_max:
            status = "optimal"
        elif ph < optimal_min - 0.5:
            status = "critical_low"
        elif ph > optimal_max + 0.5:
            status = "critical_high"
        elif ph < optimal_min:
            status = "warning_low"
        else:
            status = "warning_high"
        
        return {
            "ph": ph,
            "status": status,
            "optimal_range": f"{optimal_min} - {optimal_max}",
            "recommendations": _get_ph_recommendations(status)
        }
    
    @staticmethod
    def calculate_salinity_status(
        salinity_ppt: float
    ) -> Dict[str, str]:
        """Assess salinity status for shrimp tanks"""
        
        if 15 <= salinity_ppt <= 25:
            status = "optimal"
        elif 10 <= salinity_ppt < 15:
            status = "warning_low"
        elif 25 < salinity_ppt <= 30:
            status = "warning_high"
        elif salinity_ppt < 10:
            status = "critical_low"
        else:
            status = "critical_high"
        
        return {
            "salinity_ppt": salinity_ppt,
            "status": status,
            "optimal_range": "15 - 25 ppt",
            "recommendations": _get_salinity_recommendations(status)
        }
    
    @staticmethod
    def calculate_comprehensive_report(
        readings: Dict
    ) -> Dict:
        """
        Generate comprehensive water quality assessment from sensor readings.
        
        Parameters:
            readings: dict with keys like:
            {
                "temperature_c": float,
                "ph": float,
                "dissolved_oxygen_mg_l": float,
                "salinity_ppt": float,
                "conductivity_us_cm": float (optional),
                "tan_mg_l": float (optional)
            }
        
        Returns:
            Comprehensive assessment with all physics calculations
        """
        temp = readings.get("temperature_c", 28)
        ph = readings.get("ph", 8.0)
        do = readings.get("dissolved_oxygen_mg_l", 6.0)
        salinity = readings.get("salinity_ppt", 20)
        conductivity = readings.get("conductivity_us_cm")
        tan = readings.get("tan_mg_l", 0.5)
        
        report = {
            "timestamp": datetime.utcnow().isoformat(),
            "parameters": {
                "temperature": temp,
                "ph": ph,
                "dissolved_oxygen": do,
                "salinity": salinity
            },
            "calculations": {
                "nh3": PhysicsCalculator.calculate_nh3(tan, temp, ph, salinity),
                "do_saturation": PhysicsCalculator.calculate_do_saturation_percent(do, temp, salinity),
                "ph_status": PhysicsCalculator.calculate_ph_status(ph),
                "salinity_status": PhysicsCalculator.calculate_salinity_status(salinity)
            }
        }
        
        # Optional calculations
        if conductivity:
            report["calculations"]["tds"] = PhysicsCalculator.calculate_conductivity_to_tds(
                conductivity, temp
            )
        
        # Overall status
        statuses = [
            report["calculations"]["nh3"]["status"],
            report["calculations"]["do_saturation"]["status"],
            report["calculations"]["ph_status"]["status"],
            report["calculations"]["salinity_status"]["status"]
        ]
        
        if any(s in ["critical", "critical_low", "critical_high"] for s in statuses):
            report["overall_status"] = "CRITICAL"
        elif any(s in ["warning", "warning_low", "warning_high"] for s in statuses):
            report["overall_status"] = "WARNING"
        else:
            report["overall_status"] = "HEALTHY"
        
        return report


def _get_ph_recommendations(status: str) -> str:
    """Get pH adjustment recommendations"""
    recommendations = {
        "optimal": "Maintain current pH",
        "warning_low": "Add lime or soda ash to raise pH",
        "warning_high": "Add acid (e.g., acetic acid) to lower pH",
        "critical_low": "URGENT: Add lime or soda ash immediately",
        "critical_high": "URGENT: Add acid immediately"
    }
    return recommendations.get(status, "Check pH measurement")


def _get_salinity_recommendations(status: str) -> str:
    """Get salinity adjustment recommendations"""
    recommendations = {
        "optimal": "Maintain current salinity",
        "warning_low": "Consider adding salt water or reducing freshwater intake",
        "warning_high": "Perform partial water change with freshwater",
        "critical_low": "Add salt water or cease freshwater input",
        "critical_high": "Perform large water change with freshwater"
    }
    return recommendations.get(status, "Check salinity measurement")


if __name__ == "__main__":
    # Example usage
    sample_data = {
        "temperature_c": 28,
        "ph": 8.0,
        "dissolved_oxygen_mg_l": 6.5,
        "salinity_ppt": 20,
        "conductivity_us_cm": 4000,
        "tan_mg_l": 0.3
    }
    
    report = PhysicsCalculator.calculate_comprehensive_report(sample_data)
    import json
    print(json.dumps(report, indent=2))
