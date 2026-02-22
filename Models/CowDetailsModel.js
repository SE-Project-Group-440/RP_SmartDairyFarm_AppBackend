import mongoose from "mongoose";

const cowSchema = new mongoose.Schema(
  {
    cowId: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    tagId :{type:Number},

    name: { type: String },
    breed: { type: String },

    birthDate: {
      type: Date,
      required: true,
    },

    ageInMonths: { type: Number },

    color: { type: String },
    weight: { type: Number },

    status: {
      type: String,
      enum: ["Active", "Sold", "Dead"],
      default: "Active",
    },
  },
  { timestamps: true }
);

export default mongoose.model("Cow", cowSchema);
