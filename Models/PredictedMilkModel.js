import mongoose from "mongoose";

const milkingRecordPredSchema = new mongoose.Schema(
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
    milkingDayPred: {
      type: Number
    },

    // Date of the milking record
    datePred: {
      type: Date
    },

    // Daily milk produced (liters)
    dailyMilkPred: {
      type: Number
    },

     dailyMilkPredDone: {
      type: Number
    },

  },
  { timestamps: true }
);

export default mongoose.model("MilkingRecordPred", milkingRecordPredSchema);
