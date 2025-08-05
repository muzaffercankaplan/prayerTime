const mongoose = require("mongoose");

const prayerSchema = new mongoose.Schema(
  {
    type: {
      type: String,
      required: true,
    },

    prayers: {
      morning: String,
      night: String,
      friday: String,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("Prayer", prayerSchema);
