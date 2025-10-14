import mongoose from "mongoose";

const binSchema = new mongoose.Schema(
  {
    binId: { 
      type: String, 
      required: true, 
      unique: true 
    },
    type: { 
      type: String, 
      enum: ["Organic", "Plastic", "Metal", "Paper", "Glass"], 
      required: true 
    },
    ownerUserId: { 
      type: mongoose.Schema.Types.ObjectId, 
      ref: "User" 
    },
    location: {
      type : String,
      required: true
    },
    fillLevel: { 
      type: Number, 
      min: 0, 
      max: 5, 
      default: 0 
    },
    status: { 
      type: String, 
      enum: ["Ready", "Collected", "Pending"], 
      default: "Ready" 
    },
    lastCollectedAt: Date
  },
  { timestamps: true }
);

export default mongoose.model("Bin", binSchema);

