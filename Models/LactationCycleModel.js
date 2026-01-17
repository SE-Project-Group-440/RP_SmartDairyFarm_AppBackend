import mongoose from "mongoose";

const lactationCycleSchema = new mongoose.Schema(
  {
    
    cowId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Cow",
      required: true,
    },

    lactationRound: {
      type: Number,
      required: true,
    },

    calvingDate: { type: Date},
    lastCalvingDate: { type: Date },   
    actualDryDate: { type: Date },
    estimatedDryDate: { type: Date },

    previousLactationLength: { type: Number },  
    calvingInterval: { type: Number },  
    LactationStatus :{  type: String,
      enum: ["Active","Completed", "Pending"],
      default: "Active",},        

  
    concentratedFoodsKg: { type: Number },
    vitaminsG: { type: Number },
    mineralsG: { type: Number },

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
