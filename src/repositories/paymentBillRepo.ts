import { Model, Types } from "mongoose";
import { PaymentBill, PaymentBillDocument } from "../models/Payment";

// Define an interface for repository operations (helps with SOLID - Liskov & Interface Segregation)
export interface IPaymentBillRepository {
  create(data: Partial<PaymentBillDocument>): Promise<PaymentBillDocument>;
  findById(id: string): Promise<PaymentBillDocument | null>;
  findByBillId(billId: string): Promise<PaymentBillDocument | null>;
  findAll(): Promise<PaymentBillDocument[]>;
  update(id: string, updates: Partial<PaymentBillDocument>): Promise<PaymentBillDocument | null>;
  delete(id: string): Promise<PaymentBillDocument | null>;
}

// Implementation of the repository
export class PaymentBillRepository implements IPaymentBillRepository {
  constructor(private readonly paymentBillModel: Model<PaymentBillDocument>) {}

  async create(data: Partial<PaymentBillDocument>): Promise<PaymentBillDocument> {
    const bill = new this.paymentBillModel(data);
    return bill.save();
  }

  async findById(id: string): Promise<PaymentBillDocument | null> {
    if (!Types.ObjectId.isValid(id)) {
      throw new Error("Invalid PaymentBill ID");
    }

    return this.paymentBillModel
      .findById(id)
      .populate("userId", "name email")
      .populate("wasteRecordId", "recordId totalAmount")
      .exec();
  }

  async findByBillId(billId: string): Promise<PaymentBillDocument | null> {
    return this.paymentBillModel.findOne({ billId }).exec();
  }

  async findAll(): Promise<PaymentBillDocument[]> {
    return this.paymentBillModel
      .find()
      .populate("userId", "name email")
      .populate("wasteRecordId", "recordId totalAmount")
      .exec();
  }

  async update(id: string, updates: Partial<PaymentBillDocument>): Promise<PaymentBillDocument | null> {
    if (!Types.ObjectId.isValid(id)) {
      throw new Error("Invalid PaymentBill ID");
    }

    return this.paymentBillModel
      .findByIdAndUpdate(id, updates, { new: true })
      .exec();
  }

  async delete(id: string): Promise<PaymentBillDocument | null> {
    if (!Types.ObjectId.isValid(id)) {
      throw new Error("Invalid PaymentBill ID");
    }

    return this.paymentBillModel.findByIdAndDelete(id).exec();
  }
}
    