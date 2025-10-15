import mongoose, { Document, Schema } from "mongoose";

export interface IRoute extends Document {
  routeName?: string;
  assignedBins: mongoose.Types.ObjectId[];
  optimizedPath: { latitude: number; longitude: number }[];
  status: "Pending" | "InProgress" | "Completed";
}

const routeSchema = new Schema<IRoute>(
  {
    routeName: { type: String },
    assignedBins: [
      { type: Schema.Types.ObjectId, ref: "Bin", required: true }
    ],
    optimizedPath: [
      {
        latitude: { type: Number, required: true },
        longitude: { type: Number, required: true }
      }
    ],
    status: {
      type: String,
      enum: ["Pending", "InProgress", "Completed"],
      default: "Pending"
    }
  },
  { timestamps: true }
);

const Route = mongoose.model<IRoute>("Route", routeSchema);
export default Route;
  