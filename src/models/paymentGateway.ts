import mongoose, { Schema, Document } from "mongoose";

export interface IPayment extends Document {
  stripePaymentIntentId: string;
  amount: number;
  currency: string;
  status: string;
  metadata?: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

const PaymentSchema: Schema = new Schema({
  stripePaymentIntentId: { type: String, required: true, unique: true },
  amount: { type: Number, required: true },
  currency: { type: String, required: true },
  status: { type: String, required: true },
  metadata: { type: Schema.Types.Mixed, default: {} },
}, { timestamps: true });

export default mongoose.model<IPayment>("Payment", PaymentSchema);
