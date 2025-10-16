import { Schema, model, Document, Types, Model } from "mongoose";

// Interface for the payment bill data
export interface IPaymentBill {
  billId: string;
  userId: Types.ObjectId;
  wasteRecordId: Types.ObjectId;
  totalAmount: number;
  paidAmount: number;
  status: "pending" | "paid" | "overdue";
  paymentDate?: Date;
  createdAt?: Date;
  updatedAt?: Date;
}

// Combine the interface with Mongoose's Document type
export type PaymentBillDocument = IPaymentBill & Document;

// Define the schema
const PaymentBillSchema = new Schema<PaymentBillDocument>(
  {
    billId: { type: String, required: true, unique: true },
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    wasteRecordId: { type: Schema.Types.ObjectId, ref: "WasteRecord", required: true },
    totalAmount: { type: Number, required: true },
    paidAmount: { type: Number, default: 0 },
    status: { type: String, enum: ["pending", "paid", "overdue"], default: "pending" },
    paymentDate: { type: Date },
  },
  { timestamps: true }
);

// Create the model
export const PaymentBillModel: Model<PaymentBillDocument> = model<PaymentBillDocument>(
  "PaymentBill",
  PaymentBillSchema
);