const express = require("express");
const axios = require("axios");
const mongoose = require("mongoose");
const router = express.Router();

const BehaviorLog = require("../models/BehaviorLog");
const DiseaseRiskLog = require("../models/DiseaseRiskLog");

const EnvData = mongoose.connection.collection("env_data");
const FeedingData = mongoose.connection.collection("feeding_data");

function mapMovementScore(level) {
  if (level === "LOW") return 0.25;
  if (level === "MEDIUM") return 0.55;
  return 0.85;
}

function calculateWaterScore({ dissolved_oxygen, ph, ammonia }) {
  let score = 0;

  if (dissolved_oxygen < 4) score += 0.4;
  if (ph < 6.5 || ph > 8.5) score += 0.3;
  if (ammonia > 0.5) score += 0.3;

  return Math.min(score, 1);
}

function calculateFeedingScore(feeding) {
  const dailyFeedKg = feeding.daily_feed_kg;
  const actualFeedKg = feeding.actual_feed_kg;
  const intervalMinutes = feeding.feeding_interval_minutes || 10;
  const feedingHoursPerDay = feeding.feeding_hours_per_day || 24;

  const intervalsPerDay = (feedingHoursPerDay * 60) / intervalMinutes;
  const expectedFeed = dailyFeedKg / intervalsPerDay;

  if (!expectedFeed || expectedFeed <= 0) return 0.55;

  const ratio = actualFeedKg / expectedFeed;

  if (ratio < 0.5) return 0.85;
  if (ratio < 0.8) return 0.55;
  if (ratio <= 1.2) return 0.2;
  return 0.6;
}

router.post("/calculate/:pondId", async (req, res) => {
  try {
    const pondId = req.params.pondId;

    const behavior = await BehaviorLog.findOne({ pond_id: pondId }).sort({
      timestamp: -1,
    });

    if (!behavior) {
      return res.status(404).json({
        success: false,
        message: "No behavior data found",
      });
    }

    const env = await EnvData.findOne(
      { pond_id: pondId },
      { sort: { timestamp: -1 } }
    );

    if (!env) {
      return res.status(404).json({
        success: false,
        message: "No env data found",
      });
    }

    const feeding = await FeedingData.findOne(
      { pond_id: pondId },
      { sort: { timestamp: -1 } }
    );

    if (!feeding) {
      return res.status(404).json({
        success: false,
        message: "No feeding data found",
      });
    }

    const temperature = env.temperature ?? 28;
    const ph = env.ph;
    const dissolved_oxygen = env.dissolved_oxygen ?? 5;
    const ammonia = env.ammonia ?? 0;
    const turbidity = env.turbidity ?? 0;

    const movement_score = mapMovementScore(behavior.stress_level);

    const water_quality_score = calculateWaterScore({
      dissolved_oxygen,
      ph,
      ammonia,
    });

    const feeding_score = calculateFeedingScore(feeding);

    const modelInput = {
      temperature,
      ph,
      dissolved_oxygen,
      ammonia,
      turbidity,
      water_quality_score,
      movement_score,
      feeding_score,
    };

    const response = await axios.post("http://127.0.0.1:8000/predict", modelInput);

    const risk_level = response.data.risk_level;

    const saved = await DiseaseRiskLog.create({
      pond_id: pondId,
      ...modelInput,
      risk_level,
    });

    res.json({
      success: true,
      pond_id: pondId,
      risk_level,
      input: modelInput,
      saved,
    });
  } catch (error) {
    console.error("Disease risk calculation error:", error.message);
    res.status(500).json({
      success: false,
      message: "Prediction failed",
      error: error.message,
    });
  }
});

router.get("/latest/:pondId", async (req, res) => {
  const latest = await DiseaseRiskLog.findOne({
    pond_id: req.params.pondId,
  }).sort({ timestamp: -1 });

  res.json({
    success: true,
    data: latest,
  });
});

router.get("/history/:pondId", async (req, res) => {
  const data = await DiseaseRiskLog.find({
    pond_id: req.params.pondId,
  })
    .sort({ timestamp: -1 })
    .limit(50);

  res.json({
    success: true,
    data,
  });
});

module.exports = router;