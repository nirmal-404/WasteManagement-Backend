import mongoose, { Document, Schema } from "mongoose";

export interface IBin extends Document {
  wasteType: "Organic" | "Plastic" | "Metal" | "Paper" | "Glass" | "Other";
  location: {
    latitude: number;
    longitude: number;
  };
  locationName: string;
  status: "Ready" | "Collected" | "Pending" | "Canceled";
  userId: mongoose.Types.ObjectId;
  fillLevel?: number;
  weight?: number;
}

const binSchema = new Schema<IBin>(
  {
    wasteType: {
      type: String,
      enum: ["Organic", "Plastic", "Metal", "Paper", "Glass", "Other"],
      required: true,
    },
    location: {
      latitude: { type: Number, required: true },
      longitude: { type: Number, required: true },
    },
    locationName: {
      type: String,
      required: true,
    },
    status: {
      type: String,
      enum: ["Ready", "Collected", "Pending", "Canceled"],
      default: "Pending",
    },
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    fillLevel: { type: Number, default: 0 },
    weight: { type: Number, default: 0 },
  },
  { timestamps: true }
);


binSchema.index({ userId: 1, locationName: 1, wasteType: 1 }, { unique: true });

const Bin = mongoose.model<IBin>("Bin", binSchema);
export default Bin;
