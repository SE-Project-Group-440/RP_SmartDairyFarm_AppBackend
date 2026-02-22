import mongoose from "mongoose";

const milkingRecordSchema = new mongoose.Schema(
  {
    // Link to Cow
    cowId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Cow",
      required: true,
    },

    // Link to the lactation cycle
    lactationCycle: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "LactationCycle",
      required: true,
    },

    // Milking day number (1,2,3,...)
    milkingDay: {
      type: Number
    },

    // Date of the milking record
    date: {
      type: Date
    },

    // Daily milk produced (liters)
    dailyMilk: {
      type: Number
    },

    // Optional breakdowns
    morning: Number,
    evening: Number,
    night: Number,

    // Optional notes
    notes: { type: String }
  },
  { timestamps: true }
);

export default mongoose.model("MilkingRecord", milkingRecordSchema);
