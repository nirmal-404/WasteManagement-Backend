import { PaymentBillModel, IPaymentBill } from "../models/Payment";
import { Types } from "mongoose";

export class PaymentBillService {
  async createPaymentBill(data: {
    billId: string;
    userId: string;
    wasteRecordId: string;
    totalAmount: number;
    discountAmount: number;
    finalAmount: number;
    paymentStatus?: "PENDING" | "PAID" | "FAILED";
  }): Promise<IPaymentBill> {

    if (!data.billId || !data.userId || !data.wasteRecordId) {
      throw new Error("billId, userId, and wasteRecordId are required.");
    }

    const newPaymentBill = new PaymentBillModel({
      billId: data.billId,
      userId: new Types.ObjectId(data.userId),
      wasteRecordId: new Types.ObjectId(data.wasteRecordId),
      totalAmount: data.totalAmount,
      discountAmount: data.discountAmount,
      finalAmount: data.finalAmount,
      paymentStatus: data.paymentStatus ?? "PENDING",
    });

    return await newPaymentBill.save();
  }

  async getAllPaymentBills(): Promise<IPaymentBill[]> {
    return PaymentBillModel.find().populate("userId wasteRecordId");
  }

  async getPaymentBillById(id: string): Promise<IPaymentBill | null> {
    if (!Types.ObjectId.isValid(id)) throw new Error("Invalid bill ID.");
    return PaymentBillModel.findById(id).populate("userId wasteRecordId");
  }

  async updatePaymentBill(id: string, updateData: Partial<IPaymentBill>): Promise<IPaymentBill | null> {
    if (!Types.ObjectId.isValid(id)) throw new Error("Invalid bill ID.");
    return PaymentBillModel.findByIdAndUpdate(id, updateData, { new: true });
  }

  async deletePaymentBill(id: string): Promise<boolean> {
    if (!Types.ObjectId.isValid(id)) throw new Error("Invalid bill ID.");
    const result = await PaymentBillModel.findByIdAndDelete(id);
    return !!result;
  }
}