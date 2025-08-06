const mongoose = require("mongoose");

const dailyExecutionSchema = new mongoose.Schema(
  {
    date: {
      type: String,
      required: true,
    },
    jobKey: {
      type: String,
      required: true,
    },
    jobName: {
      type: String,
      required: true,
    },
    plannedTime: {
      hour: Number,
      minute: Number,
    },
    executed: {
      type: Boolean,
      default: false,
    },
    executedAt: {
      type: Date,
    },
  },
  {
    timestamps: true,
  }
);

// Compound index for date and jobKey
dailyExecutionSchema.index({ date: 1, jobKey: 1 }, { unique: true });

module.exports = mongoose.model("DailyExecution", dailyExecutionSchema);
