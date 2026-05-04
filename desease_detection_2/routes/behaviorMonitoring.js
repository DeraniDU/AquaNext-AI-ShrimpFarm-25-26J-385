const express = require("express");
const router = express.Router();
const BehaviorLog = require("../models/BehaviorLog");

// POST: save one behavior record
router.post("/", async (req, res) => {
  try {
    const {
      timestamp,
      pond_id,
      camera_id,
      source,
      stress_score,
      stress_level,
      features,
    } = req.body;

    if (!pond_id || stress_score === undefined || !stress_level) {
      return res.status(400).json({
        success: false,
        message: "pond_id, stress_score, and stress_level are required",
      });
    }

    const newLog = new BehaviorLog({
      timestamp: timestamp || new Date(),
      pond_id,
      camera_id: camera_id || "IPCAM_01",
      source: source || "ip_camera",
      stress_score,
      stress_level,
      features: features || {},
    });

    const saved = await newLog.save();

    res.status(201).json({
      success: true,
      message: "Behavior log saved successfully",
      data: saved,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to save behavior log",
      error: error.message,
    });
  }
});

// GET: latest record by pond
router.get("/latest/:pondId", async (req, res) => {
  try {
    const latest = await BehaviorLog.findOne({
      pond_id: req.params.pondId,
    }).sort({ timestamp: -1 });

    if (!latest) {
      return res.status(404).json({
        success: false,
        message: "No behavior data found for this pond",
      });
    }

    res.json({
      success: true,
      data: latest,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to fetch latest behavior log",
      error: error.message,
    });
  }
});

// GET: history for graph
router.get("/history/:pondId", async (req, res) => {
  try {
    const minutes = parseInt(req.query.minutes) || 30;
    const fromTime = new Date(Date.now() - minutes * 60 * 1000);

    const logs = await BehaviorLog.find({
      pond_id: req.params.pondId,
      timestamp: { $gte: fromTime },
    })
      .sort({ timestamp: 1 })
      .select("timestamp pond_id stress_score stress_level features");

    res.json({
      success: true,
      count: logs.length,
      data: logs,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to fetch behavior history",
      error: error.message,
    });
  }
});

module.exports = router;