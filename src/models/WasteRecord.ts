import { Schema, model, Document, Types } from "mongoose";

export interface IWasteRecord extends Document {
  recordId: string;
  userId: Types.ObjectId;
  binId?: Types.ObjectId;
  weight?: number;
  wasteType?: string;
  totalAmount: number;
  description?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

const wasteRecordSchema = new Schema<IWasteRecord>(
  {
    recordId: { type: String, required: true, unique: true },
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    binId: { type: Schema.Types.ObjectId, ref: "Bin" },
    weight: { type: Number },
    wasteType: { type: String },
    totalAmount: { type: Number, required: true },
    description: { type: String },
  },
  { timestamps: true }
);

export const WasteRecord = model<IWasteRecord>("WasteRecord", wasteRecordSchema);
