const express = require("express");
const axios = require("axios");
const router = express.Router();

// POST: calculate disease risk
router.post("/calculate", async (req, res) => {
  try {
    const {
      temperature,
      ph,
      dissolved_oxygen,
      ammonia,
      turbidity,
      water_quality_score,
      movement_score,
      feeding_score,
    } = req.body;

    // Send to Python model
    const response = await axios.post("http://localhost:8000/predict", {
      temperature,
      ph,
      dissolved_oxygen,
      ammonia,
      turbidity,
      water_quality_score,
      movement_score,
      feeding_score,
    });

    const risk = response.data.risk_level;

    res.json({
      success: true,
      risk_level: risk,
    });

  } catch (error) {
    console.error(error.message);
    res.status(500).json({
      success: false,
      message: "Prediction failed",
    });
  }
});

module.exports = router;