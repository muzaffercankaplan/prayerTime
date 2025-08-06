const mongoose = require("mongoose");

const prayerSchema = new mongoose.Schema(
  {
    type: {
      type: String,
      required: true,
    },
    date: {
      type: Date,
      default: Date.now,
    },
    prayers: {
      morning: String,
      night: String,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("Prayer", prayerSchema);
