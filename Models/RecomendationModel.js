import mongoose from "mongoose";

const RecommendationSchema = new mongoose.Schema(
  {
    cowId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Cow",
      required: true,
    },

    lactationCycleId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "LactationCycle",
      required: true,
    },

    milkingRecordId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "MilkingRecord",
      required: true,
    },

    status: {
      type: String,
      enum: ["below_expected"],
      required: true,
    },

    title: String,
    message: String,

    actions: [String],

    isResolved: {
      type: Boolean,
      default: false,
    },

    resolvedAt: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true }
);

export default mongoose.model("Recommendation", RecommendationSchema);
