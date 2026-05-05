const mongoose = require("mongoose");

const connectExternalDBs = () => {
  const waterDbUri = process.env.WATER_DB_URI || "mongodb://localhost:27017/water_quality_db";
  const feedingDbUri = process.env.FEEDING_DB_URI || "mongodb://localhost:27017/feeding_db";

  const waterDb = mongoose.createConnection(waterDbUri);
  waterDb.on("connected", () => {
    console.log("Water DB Connected");
  });
  waterDb.on("error", (error) => {
    console.error("Water DB connection failed:", error.message);
  });

  const feedingDb = mongoose.createConnection(feedingDbUri);
  feedingDb.on("connected", () => {
    console.log("Feeding DB Connected");
  });
  feedingDb.on("error", (error) => {
    console.error("Feeding DB connection failed:", error.message);
  });

  return { waterDb, feedingDb };
};

module.exports = connectExternalDBs;
