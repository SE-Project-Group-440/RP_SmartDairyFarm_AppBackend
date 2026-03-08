import mongoose from "mongoose";

const SprinklerSchema = new mongoose.Schema({
  cattleId: { type: String, required: true, unique: true },
  mode: {
    type: String,
    enum: ["AUTO", "MANUAL"],
    default: "AUTO"
  },
  state: {
    type: Boolean,
    default: false
  }
}, { timestamps: true });

export default mongoose.model("Sprinkler", SprinklerSchema);