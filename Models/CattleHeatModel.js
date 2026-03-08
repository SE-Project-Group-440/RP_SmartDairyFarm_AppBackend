import mongoose from "mongoose";

const CattleHeatSchema = new mongoose.Schema({
  name: { type: String, required: true },
  collarId: { type: String, required: true },
  bodyTemp: Number,
  envTemp: Number,
  humidity: Number,
  collarStatus: {
    type: String,
    enum: ["active", "inactive"],
    default: "active"
  }
}, { timestamps: true });

export default mongoose.model("CattleHeat", CattleHeatSchema);