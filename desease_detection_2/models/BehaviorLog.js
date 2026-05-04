const mongoose = require("mongoose");

const behaviorLogSchema = new mongoose.Schema(
  {
    timestamp: {
      type: Date,
      required: true,
      default: Date.now,
    },
    pond_id: {
      type: String,
      required: true,
    },
    camera_id: {
      type: String,
      required: true,
      default: "IPCAM_01",
    },
    source: {
      type: String,
      required: true,
      default: "ip_camera",
    },
    stress_score: {
      type: Number,
      required: true,
    },
    stress_level: {
      type: String,
      required: true,
      enum: ["LOW", "MEDIUM", "HIGH", "low_stress", "medium_stress", "high_stress"],
    },
    features: {
      avg_flow_mag: Number,
      std_flow_mag: Number,
      active_area_ratio: Number,
      clustering_score: Number,
      movement_stability: Number,
      activity_balance: Number,
      activity_intensity: Number,
    },
  },
  {
    versionKey: false,
  }
);

module.exports = mongoose.model("BehaviorLog", behaviorLogSchema);