import mongoose from "mongoose";

const milkingRecordPredSchema = new mongoose.Schema(
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

   
    milkingDayPred: {
      type: Number
    },

  
    datePred: {
      type: Date
    },


    dailyMilkPred: {
      type: Number
    },

    // actual recorded milk for that predicted day (when available)
    actualDailyMilk: {
      type: Number,
      default: null,
    },

    // flag indicating whether actual recording has been done for this prediction
    dailyMilkPredDone: {
      type: Number,
      default: 0,
    },

    LactationPredStatus: {
      type: String,
      enum: ["Completed", "NotCompleted"],
      default: "NotCompleted",
    },   

  },
  { timestamps: true }
);

export default mongoose.model("MilkingRecordPred", milkingRecordPredSchema);
