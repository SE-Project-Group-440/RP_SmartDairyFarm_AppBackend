import mongoose from "mongoose";

const lactationCycleSchema = new mongoose.Schema(
  {
    // Link to the cow
    cowId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Cow",
      required: true,
    },

    // Lactation number (1st, 2nd, 3rd...)
    lactationRound: {
      type: Number,
      required: true,
    },

    // Key lactation cycle dates
    calvingDate: { type: Date},
    lastCalvingDate: { type: Date },   
    actualDryDate: { type: Date },
    estimatedDryDate: { type: Date },

    // Duration & intervals
    previousLactationLength: { type: Number },  // days
    calvingInterval: { type: Number },          // days

    // Feeding details for the cycle
    concentratedFoodsKg: { type: Number },
    vitaminsG: { type: Number },
    mineralsG: { type: Number },

    // Health status for cycle
    healthStatus: {
      type: String,
      enum: ["Healthy", "Unhealthy", "UnderObservation"],
      default: "Healthy",
    }
  },
  { timestamps: true }

  
);

lactationCycleSchema.virtual("milkingRecords", {
  ref: "MilkingRecord",
  localField: "_id",
  foreignField: "lactationCycle"
});

lactationCycleSchema.set("toObject", { virtuals: true });
lactationCycleSchema.set("toJSON", { virtuals: true });


export default mongoose.model("LactationCycle", lactationCycleSchema);
