require("dotenv").config();
const express = require("express");
const cors = require("cors");
const connectDB = require("./config/db");
require("./config/externalDbs")(); // Initialize external DB connections

const behaviorMonitoringRoutes = require("./routes/behaviorMonitoring");
const diseaseRiskRoutes = require("./routes/diseaseRisk");
const app = express();

connectDB();

app.use(cors());
app.use(express.json());

app.get("/", (req, res) => {
  res.send("Disease detection backend running");
});

app.use("/api/behavior-monitoring", behaviorMonitoringRoutes);
app.use("/api/disease-risk", diseaseRiskRoutes);

const axios = require("axios");

setInterval(async () => {
  try {
    await axios.post("http://localhost:5000/api/disease-risk/calculate/P01");
    console.log("Auto risk calculation triggered");
  } catch (err) {
    console.error("Auto calculation failed:", err.message);
  }
}, 5000); // every 5 seconds

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});