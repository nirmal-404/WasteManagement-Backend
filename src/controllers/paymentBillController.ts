import { Request, Response } from "express";
import { Types } from "mongoose";
import { PaymentBillModel } from "../models/PaymentBill";
import { Reward } from "../models/Reward";
import { createNotification } from "../utils/notificationUtils";

export const createPaymentBill = async (req: Request, res: Response): Promise<void> => {
  try {
    const bill = await PaymentBillModel.create(req.body);
    res.json(bill);
  } catch (e: any) {
    res.status(500).json({ message: e.message || 'Failed to create bill' });
  }
};

export const getAllPaymentBills = async (_req: Request, res: Response): Promise<void> => {
  try {
    const bills = await PaymentBillModel.find()
      .populate("userId", "name email")
      .populate("wasteRecordId", "recordId totalAmount");
    res.json(bills);
  } catch (e: any) {
    res.status(500).json({ message: e.message || 'Failed to fetch bills' });
  }
};

export const getPaymentBillById = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params as { id?: string };
    if (!id) {
      res.status(400).json({ message: 'Invalid ID' });
      return;
    }
    if (!Types.ObjectId.isValid(id)) {
      res.status(400).json({ message: 'Invalid ID' });
      return;
    }
    const bill = await PaymentBillModel.findById(id)
      .populate("userId", "name email")
      .populate("wasteRecordId", "recordId totalAmount");
    if (!bill) {
      res.status(404).json({ message: 'Not found' });
      return;
    }
    res.json(bill);
  } catch (e: any) {
    res.status(500).json({ message: e.message || 'Failed to fetch bill' });
  }
};

export const updatePaymentBill = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params as { id?: string };
    if (!id) {
      res.status(400).json({ message: 'Invalid ID' });
      return;
    }
    if (!Types.ObjectId.isValid(id)) {
      res.status(400).json({ message: 'Invalid ID' });
      return;
    }
    const bill = await PaymentBillModel.findByIdAndUpdate(id, req.body, { new: true });
    if (!bill) {
      res.status(404).json({ message: 'Not found' });
      return;
    }
    res.json(bill);
  } catch (e: any) {
    res.status(500).json({ message: e.message || 'Failed to update bill' });
  }
};

export const deletePaymentBill = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params as { id?: string };
    if (!id) {
      res.status(400).json({ message: 'Invalid ID' });
      return;
    }
    if (!Types.ObjectId.isValid(id)) {
      res.status(400).json({ message: 'Invalid ID' });
      return;
    }
    const bill = await PaymentBillModel.findByIdAndDelete(id);
    if (!bill) {
      res.status(404).json({ message: 'Not found' });
      return;
    }
    res.json({ message: 'Deleted' });
  } catch (e: any) {
    res.status(500).json({ message: e.message || 'Failed to delete bill' });
  }
};

// Get current user's bills
export const getMyBills = async (req: any, res: Response): Promise<void> => {
  try {
    const userId = req.user?._id;
    if (!userId || !Types.ObjectId.isValid(userId)) {
      res.status(400).json({ message: 'Invalid user' });
      return;
    }
    const bills = await PaymentBillModel.find({ userId })
      .populate("wasteRecordId", "recordId totalAmount")
      .sort({ createdAt: -1 });
    res.json({ bills });
  } catch (e: any) {
    res.status(500).json({ message: e.message || "Failed to fetch bills" });
  }
};

// Pay a bill (mark as paid)
export const payBill = async (req: any, res: Response): Promise<void> => {
  try {
    const userId = req.user?._id;
    const billId = req.params.id;
    if (!userId || !Types.ObjectId.isValid(userId)) {
      res.status(400).json({ message: 'Invalid user' });
      return;
    }
    if (!Types.ObjectId.isValid(billId)) {
      res.status(400).json({ message: 'Invalid ID' });
      return;
    }

    const bill = await PaymentBillModel.findOne({ _id: billId, userId });
    if (!bill) {
      res.status(404).json({ message: "Bill not found" });
      return;
    }

    // Optional reward redemption
    const redeem = Math.max(Number(req.body?.redeem || 0), 0);
    let redeemed = 0;
    try {
      if (redeem > 0) {
        const reward = await Reward.findOne({ userId });
        const now = new Date();
        if (reward && reward.points > 0 && reward.expiryDate && reward.expiryDate > now) {
          redeemed = Math.min(redeem, reward.points, bill.totalAmount);
          reward.points = reward.points - redeemed;
          await reward.save();
        }
      }
    } catch {}

    bill.status = "paid" as any;
    bill.paidAmount = bill.totalAmount - redeemed;
    bill.paymentDate = new Date();
    await bill.save();

    // Reward logic: grant 1% of total as points, set or extend expiry to 90 days from now
    try {
      const grantPoints = Math.floor(((bill.totalAmount - redeemed) || 0) * 0.01);
      const now = new Date();
      const expiry = new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000);
      const reward = await Reward.findOne({ userId });
      if (!reward) {
        await Reward.create({ userId, points: grantPoints, expiryDate: expiry });
      } else {
        reward.points = (reward.points || 0) + grantPoints;
        // If expired or close to expiry, extend
        reward.expiryDate = reward.expiryDate && reward.expiryDate > now ? reward.expiryDate : expiry;
        await reward.save();
      }
    } catch {}

    // Notification
    try {
      const message = `Payment received for bill ${bill.billId}. Thank you!`;
      await createNotification(userId.toString(), message, 'success');
    } catch {}

    res.json({ message: "Bill paid successfully", bill, redeemed });
  } catch (e: any) {
    res.status(500).json({ message: e.message || "Failed to pay bill" });
  }
};
