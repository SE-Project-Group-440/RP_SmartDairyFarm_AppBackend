import mongoose from "mongoose";

const diseasePredictionSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: false, // Optional in case predictions are made without user login
    },
    cowId: {
      type: String,
      required: false, // Optional, might be provided from frontend
    },
    prediction: {
      type: String,
      required: true, // The predicted disease (e.g., "FMD", "LSD", "Healthy")
    },
    severity: {
      type: String,
      enum: ["Mild", "Moderate", "Severe", "Critical"],
      required: false, // Severity level of the disease
    },
    confidence: {
      type: Number,
      required: false, // Confidence score from AI model (percentage)
    },
    inputData: {
      symptoms: {
        type: String,
        required: false,
      },
      hasImage: {
        type: Boolean,
        default: false,
      },
      hasReport: {
        type: Boolean,
        default: false,
      },
      imageFileName: {
        type: String,
        required: false,
      },
      reportFileName: {
        type: String,
        required: false,
      }
    },
    aiResponse: {
      type: mongoose.Schema.Types.Mixed, // Store the complete AI response
      required: true,
    },
    careInstructionsProvided: {
      type: Boolean,
      default: false,
    },
    status: {
      type: String,
      enum: ["Active", "Archived", "Reviewed"],
      default: "Active",
    }
  },
  { 
    timestamps: true 
  }
);

// Index for better query performance
diseasePredictionSchema.index({ userId: 1, createdAt: -1 });
diseasePredictionSchema.index({ prediction: 1 });
diseasePredictionSchema.index({ cowId: 1 });

export default mongoose.model("DiseasePrediction", diseasePredictionSchema);