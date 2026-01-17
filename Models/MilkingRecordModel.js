import mongoose from "mongoose";

const milkingRecordSchema = new mongoose.Schema(
  {
  
    cowId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Cow",
      required: true,
    },
    lactationCycle: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "LactationCycle",
      required: true,
    },

    milkingDay: {
      type: Number
    },

    date: {
      type: Date
    },

    dailyMilk: {
      type: Number
    },

    morning: Number,
    evening: Number,


    notes: { type: String }
  },
  { timestamps: true }
);

export default mongoose.model("MilkingRecord", milkingRecordSchema);
