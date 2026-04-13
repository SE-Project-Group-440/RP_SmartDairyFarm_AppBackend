import mongoose from "mongoose";

const aiRecommendationSchema = new mongoose.Schema(
  {
    cowId: {
      type: String,
      ref: "Cow",
      required: true,
    },
    input_data: {
      type: Object,
      required: true,
    },
    model_features: {
      type: Object,
    },
    recommended_next_ai: {
      type: Date,
      required: true,
    },
    status: {
      type: String,
      enum: ["PENDING", "COMPLETED"],
      default: "PENDING",
    },
    ai_date: {
      type: Date,
    },
    
    pregnancy_probability: Number,
    risk_level: String,
    days_since_ai: Number,
    pregnancy_check_date: Date,
    pregnancy_check_status: String,

    model_version: {
      type: String,
      default: "v1.0",
    },
  },
  { timestamps: true }
);

export default mongoose.model("AiRecommendation", aiRecommendationSchema);