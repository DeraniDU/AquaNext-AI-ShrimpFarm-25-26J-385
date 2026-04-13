#!/usr/bin/env python3
"""
Generate synthetic CSV rows for training harvest ML models.

One row per (simulated_pond_episode, observation_day). Labels are computed from
the same growth/water simulation so XGBoost learns consistent patterns.

Usage:
  python -m models.training.generate_harvest_ml_csv --rows 25000 --out models/training/harvest_ml_training.csv
"""

from __future__ import annotations

import argparse
import csv
import random
from pathlib import Path
from typing import List

from models.training.harvest_ml_features import (
    HARVEST_ML_FEATURE_NAMES,
    HARVEST_ML_LABEL_BIOMASS,
    HARVEST_ML_LABEL_DAYS,
    HARVEST_ML_LABEL_DELTA,
    HARVEST_ML_LABEL_RISK,
)


def _weight_at_day(day: float, cycle_len: float, w0: float, w_max: float, stress: float) -> float:
    """Logistic-ish growth with stress slowing progress."""
    t = day / max(cycle_len, 1.0)
    base = w0 + (w_max - w0) * (1.0 - pow(1.0 - min(t, 1.0), 1.8))
    return max(w0, base * (1.0 - 0.35 * stress))


def generate_row(rng: random.Random, target_weight: float = 22.0) -> dict:
    """
    Simulate one observation day in a pond episode and return feature dict + labels.
    """
    cycle_len = rng.uniform(65.0, 105.0)
    w0 = rng.uniform(0.6, 2.5)
    w_max = rng.uniform(23.0, 28.0)
    obs_day = rng.uniform(5.0, min(95.0, cycle_len + 15.0))

    # Stress 0..1 affects water and growth
    stress = rng.uniform(0.0, 1.0)
    if rng.random() < 0.15:
        stress = min(1.0, stress + rng.uniform(0.2, 0.5))

    w = _weight_at_day(obs_day, cycle_len, w0, w_max, stress)
    w_lag7 = _weight_at_day(max(0.0, obs_day - 7.0), cycle_len, w0, w_max, stress)
    w_lag14 = _weight_at_day(max(0.0, obs_day - 14.0), cycle_len, w0, w_max, stress)
    w_next = _weight_at_day(obs_day + 1.0, cycle_len, w0, w_max, stress)

    dissolved_oxygen = max(3.5, min(9.0, 7.2 - stress * 2.8 + rng.gauss(0, 0.35)))
    temperature = max(24.0, min(33.0, 28.5 + rng.gauss(0, 1.0) + stress * 1.2))
    ammonia = max(0.01, min(0.45, 0.06 + stress * 0.22 + rng.gauss(0, 0.02)))
    ph = max(7.0, min(8.6, 7.85 + rng.gauss(0, 0.12)))
    salinity = max(12.0, min(30.0, 20.0 + rng.gauss(0, 2.0)))

    shrimp_count = int(rng.uniform(45_000, 220_000))
    biomass_kg = shrimp_count * w / 1000.0
    feed_amount = rng.uniform(80.0, 450.0)
    feeding_frequency = rng.choice([2, 3, 4, 5])
    rolling_feed_kg_7d = rng.uniform(15.0, 120.0) * (1.0 + 0.2 * stress)

    days_normalized = min(1.0, obs_day / 120.0)

    # True days to reach target_weight by forward simulation
    d = obs_day
    w_cur = w
    days_to_harvest = 0
    max_forward = 150
    crisis = False
    while w_cur < target_weight and days_to_harvest < max_forward:
        days_to_harvest += 1
        d += 1.0
        # Escalate stress under poor water
        local_stress = stress
        if dissolved_oxygen < 4.8 or ammonia > 0.22:
            local_stress = min(1.0, local_stress + 0.08)
        w_new = _weight_at_day(d, cycle_len, w0, w_max, local_stress)
        if w_new <= w_cur + 0.01 and days_to_harvest > 14:
            crisis = True
            break
        w_cur = w_new
        if local_stress > 0.92 and rng.random() < 0.12:
            crisis = True
            break

    if w_cur >= target_weight:
        final_w = min(w_cur, w_max)
    else:
        final_w = w_cur

    mortality = rng.uniform(0.88, 0.98) * (0.92 if crisis else 1.0)
    harvest_biomass_kg = shrimp_count * final_w / 1000.0 * mortality

    early_risk = 1 if (crisis or (dissolved_oxygen < 4.9 and ammonia > 0.19) or stress > 0.82) else 0
    if early_risk == 0 and rng.random() < 0.06:
        early_risk = 1

    weight_delta_next = max(-0.5, w_next - w)

    row = {
        HARVEST_ML_FEATURE_NAMES[0]: round(w, 4),
        HARVEST_ML_FEATURE_NAMES[1]: shrimp_count,
        HARVEST_ML_FEATURE_NAMES[2]: round(biomass_kg, 4),
        HARVEST_ML_FEATURE_NAMES[3]: round(feed_amount, 4),
        HARVEST_ML_FEATURE_NAMES[4]: feeding_frequency,
        HARVEST_ML_FEATURE_NAMES[5]: round(rolling_feed_kg_7d, 4),
        HARVEST_ML_FEATURE_NAMES[6]: round(dissolved_oxygen, 4),
        HARVEST_ML_FEATURE_NAMES[7]: round(temperature, 4),
        HARVEST_ML_FEATURE_NAMES[8]: round(ammonia, 4),
        HARVEST_ML_FEATURE_NAMES[9]: round(ph, 4),
        HARVEST_ML_FEATURE_NAMES[10]: round(salinity, 4),
        HARVEST_ML_FEATURE_NAMES[11]: round(days_normalized, 6),
        HARVEST_ML_FEATURE_NAMES[12]: round(w_lag7, 4),
        HARVEST_ML_FEATURE_NAMES[13]: round(w_lag14, 4),
        HARVEST_ML_LABEL_DAYS: int(max(0, min(120, days_to_harvest))),
        HARVEST_ML_LABEL_BIOMASS: round(harvest_biomass_kg, 4),
        HARVEST_ML_LABEL_RISK: early_risk,
        HARVEST_ML_LABEL_DELTA: round(weight_delta_next, 6),
    }
    return row


def write_csv(path: Path, num_rows: int, seed: int = 42) -> None:
    rng = random.Random(seed)
    path.parent.mkdir(parents=True, exist_ok=True)
    headers: List[str] = list(HARVEST_ML_FEATURE_NAMES) + [
        HARVEST_ML_LABEL_DAYS,
        HARVEST_ML_LABEL_BIOMASS,
        HARVEST_ML_LABEL_RISK,
        HARVEST_ML_LABEL_DELTA,
    ]
    with path.open("w", newline="", encoding="utf-8") as f:
        w = csv.DictWriter(f, fieldnames=headers)
        w.writeheader()
        for _ in range(num_rows):
            w.writerow(generate_row(rng))


def main() -> None:
    p = argparse.ArgumentParser(description="Generate harvest_ml_training.csv")
    p.add_argument("--rows", type=int, default=25_000, help="Number of training rows")
    p.add_argument(
        "--out",
        type=str,
        default="models/training/harvest_ml_training.csv",
        help="Output CSV path",
    )
    p.add_argument("--seed", type=int, default=42)
    args = p.parse_args()
    out = Path(args.out)
    write_csv(out, args.rows, args.seed)
    print(f"Wrote {args.rows} rows to {out.resolve()}")


if __name__ == "__main__":
    main()
