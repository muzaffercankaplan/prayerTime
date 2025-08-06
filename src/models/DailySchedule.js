const mongoose = require("mongoose");

const dailyScheduleSchema = new mongoose.Schema(
  {
    date: {
      type: String,
      required: true,
      unique: true,
    },
    randomTimes: {
      type: Map,
      of: {
        hour: Number,
        minute: Number,
        daysOfWeek: [Number],
        immediate: Boolean,
      },
      default: new Map(),
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("DailySchedule", dailyScheduleSchema);
