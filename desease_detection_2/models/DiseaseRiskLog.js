const mongoose = require("mongoose");

const diseaseRiskLogSchema = new mongoose.Schema(
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
    temperature: Number,
    ph: Number,
    dissolved_oxygen: Number,
    ammonia: Number,
    turbidity: Number,
    water_quality_score: Number,
    movement_score: Number,
    feeding_score: Number,
    risk_level: {
      type: String,
      required: true,
    },
  },
  {
    versionKey: false,
  }
);

module.exports = mongoose.model("DiseaseRiskLog", diseaseRiskLogSchema);
