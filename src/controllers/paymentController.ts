import { Request, Response } from "express";
import { body, validationResult } from "express-validator";
import Payment from "../models/Payment.js";
import RequestModel from "../models/Request.js";
import User from "../models/User.js";
import WasteRecord from "../models/WasteRecord.js";
import { v4 as uuidv4 } from 'uuid';

interface AuthenticatedRequest extends Request {
  user?: any;
}

// Credit calculation with 30% cap
const capCredits = (subtotal: number, credits: number) => {
  const max = Math.floor(subtotal * 0.3);
  const used = Math.min(credits, max);
  return { used, total: subtotal - used };
};

// Mock payment gateway
const mockPaymentGateway = async (amount: number, paymentMethod: string) => {
  // Simulate processing delay
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  // Mock success rate (95%)
  const success = Math.random() > 0.05;
  
  if (success) {
    return {
      success: true,
      transactionId: `TXN-${Date.now()}-${uuidv4().substring(0, 8).toUpperCase()}`,
      gatewayRef: `GW-${Date.now()}`,
      amount,
      currency: 'LKR',
      status: 'COMPLETED'
    };
  } else {
    return {
      success: false,
      error: 'Payment declined by bank',
      errorCode: 'DECLINED'
    };
  }
};

// Validation middleware
export const checkoutValidation = [
  body('billMonth').notEmpty().withMessage('Bill month is required'),
  body('paymentMethod').isIn(['CARD', 'BANK_TRANSFER', 'WALLET', 'CASH']).withMessage('Invalid payment method'),
  body('items').isArray().withMessage('Items must be an array')
];

export const summary = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { month } = req.query;
  const billMonth = month || new Date().toISOString().slice(0, 7);
    
    // Get user's pending requests for the month
    const startDate = new Date(billMonth + '-01');
    const endDate = new Date(startDate);
    endDate.setMonth(endDate.getMonth() + 1);
    
    const pendingRequests = await RequestModel.find({
      userId: req.user._id,
      status: { $in: ['COMPLETED', 'SCHEDULED'] },
      createdAt: { $gte: startDate, $lt: endDate }
    });
    
    // Get waste records for the month
    const wasteRecord = await WasteRecord.findOne({
      userId: req.user._id,
      month: billMonth
    });
    
    // Calculate items
    const items = [];
    
    // Add special collection fees
    pendingRequests.forEach(request => {
      if (request.status === 'COMPLETED' && request.fee > 0) {
        items.push({
          type: 'SPECIAL_COLLECTION',
          description: `${request.type} Collection - ${request.description}`,
          amount: request.fee,
          requestId: request._id
        });
      }
    });
    
    // Add monthly waste management fee
    if (wasteRecord) {
      const monthlyFee = 500; // Base monthly fee
      items.push({
        type: 'MONTHLY_FEE',
        description: `Monthly Waste Management Fee - ${billMonth}`,
        amount: monthlyFee
      });
      
      // Add fines if any
      if (wasteRecord.fines > 0) {
        items.push({
          type: 'FINE',
          description: 'Late fees and penalties',
          amount: wasteRecord.fines
        });
      }
    } else {
      // Default monthly fee if no waste record
      items.push({
        type: 'MONTHLY_FEE',
        description: `Monthly Waste Management Fee - ${billMonth}`,
        amount: 500
      });
    }
    
    const subtotal = items.reduce((sum, item) => sum + item.amount, 0);
  const credits = req.user.rewardsBalance || 0;
  const { used, total } = capCredits(subtotal, credits);
    
    res.json({
      billMonth,
      items,
      subtotal,
      creditsAvailable: credits,
      maxCredit: Math.floor(subtotal * 0.3),
      totalAfterCredits: total,
      previewCreditUsed: used,
      dueDate: new Date(endDate.getTime() + 15 * 24 * 60 * 60 * 1000) // 15 days after month end
    });
  } catch (error: any) {
    console.error('Payment summary error:', error);
    res.status(500).json({ 
      message: error.message || "Failed to get payment summary" 
    });
  }
};

export const applyCredits = async (req: AuthenticatedRequest, res: Response) => {
  try {
  const { billMonth, subtotal, credits } = req.body;
    
    if (subtotal <= 0) {
      return res.status(400).json({ message: "Invalid subtotal" });
    }
    
  const { used, total } = capCredits(subtotal, credits);
    
    res.json({
      billMonth,
      creditUsed: used,
      totalPayable: total,
      discountPercentage: subtotal > 0 ? (used / subtotal * 100).toFixed(2) : 0
    });
  } catch (error: any) {
    console.error('Apply credits error:', error);
    res.status(500).json({ 
      message: error.message || "Failed to apply credits" 
    });
  }
};

export const checkout = async (req: AuthenticatedRequest, res: Response) => {
  try {
    // Check validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        message: "Validation failed", 
        errors: errors.array() 
      });
    }

    const { billMonth, items = [], paymentMethod, creditsApplied = 0 } = req.body;
    
    const subtotal = items.reduce((sum: number, item: any) => sum + (item.amount || 0), 0);
    const totalPayable = subtotal - creditsApplied;
    
    // Validate credits
    const maxCredits = Math.floor(subtotal * 0.3);
    if (creditsApplied > maxCredits) {
      return res.status(400).json({ 
        message: "Credits applied exceed maximum allowed (30%)" 
      });
    }
    
    if (creditsApplied > (req.user.rewardsBalance || 0)) {
      return res.status(400).json({ 
        message: "Insufficient reward balance" 
      });
    }
    
    // Generate payment ID
    const paymentId = `PAY-${Date.now()}-${uuidv4().substring(0, 8).toUpperCase()}`;
    
    // Create payment record
    const payment = await Payment.create({
      paymentId,
      userId: req.user._id,
      billMonth,
      items,
      subtotal,
      creditsApplied,
      totalPayable,
      paymentMethod,
      status: "PENDING",
      dueDate: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000) // 15 days from now
    });
    
    // Process payment through mock gateway
    payment.status = "PROCESSING";
    await payment.save();
    
    const gatewayResult = await mockPaymentGateway(totalPayable, paymentMethod);
    
    if (gatewayResult.success) {
      // Payment successful
      payment.status = "SUCCESS";
      payment.gatewayRef = gatewayResult.gatewayRef;
      payment.gatewayResponse = gatewayResult;
      payment.paidAt = new Date();
      payment.receiptUrl = `/receipts/${paymentId}`;
      
      // Deduct credits from user balance
      if (creditsApplied > 0) {
        await User.findByIdAndUpdate(req.user._id, {
          $inc: { rewardsBalance: -creditsApplied }
        });
      }
      
      // Add reward points (5% of payment as rewards)
      const rewardPoints = Math.floor(totalPayable * 0.05);
      await User.findByIdAndUpdate(req.user._id, {
        $inc: { rewardsBalance: rewardPoints }
      });
      
      await payment.save();
      
      res.json({
        message: "Payment successful",
        payment,
        rewardPointsEarned: rewardPoints,
        receiptUrl: payment.receiptUrl
      });
    } else {
      // Payment failed
      payment.status = "FAILED";
      payment.gatewayResponse = gatewayResult;
      payment.attempts += 1;
      await payment.save();
      
      res.status(400).json({
        message: "Payment failed",
        error: gatewayResult.error,
        payment
      });
    }
  } catch (error: any) {
    console.error('Checkout error:', error);
    res.status(500).json({ 
      message: error.message || "Payment processing failed" 
    });
  }
};

export const history = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { status, page = 1, limit = 10 } = req.query;
    const skip = (Number(page) - 1) * Number(limit);
    
    const query: any = { userId: req.user._id };
    if (status) {
      query.status = status;
    }
    
    const payments = await Payment.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(Number(limit));
    
    const total = await Payment.countDocuments(query);
    
    res.json({
      payments,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        pages: Math.ceil(total / Number(limit))
      }
    });
  } catch (error: any) {
    console.error('Payment history error:', error);
    res.status(500).json({ 
      message: error.message || "Failed to get payment history" 
    });
  }
};

export const getPaymentById = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const payment = await Payment.findById(req.params.id);
    
    if (!payment) {
      return res.status(404).json({ message: "Payment not found" });
    }
    
    if (payment.userId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: "Access denied" });
    }
    
    res.json({ payment });
  } catch (error: any) {
    console.error('Get payment error:', error);
    res.status(500).json({ 
      message: error.message || "Failed to get payment" 
    });
  }
};

export const retryPayment = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const payment = await Payment.findById(req.params.id);
    
    if (!payment) {
      return res.status(404).json({ message: "Payment not found" });
    }
    
    if (payment.userId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: "Access denied" });
    }
    
    if (payment.status !== "FAILED") {
      return res.status(400).json({ message: "Only failed payments can be retried" });
    }
    
    if (payment.attempts >= payment.maxAttempts) {
      return res.status(400).json({ message: "Maximum retry attempts reached" });
    }
    
    // Retry payment
    payment.status = "PROCESSING";
    payment.attempts += 1;
    await payment.save();
    
    const gatewayResult = await mockPaymentGateway(payment.totalPayable, payment.paymentMethod);
    
    if (gatewayResult.success) {
      payment.status = "SUCCESS";
      payment.gatewayRef = gatewayResult.gatewayRef;
      payment.gatewayResponse = gatewayResult;
      payment.paidAt = new Date();
      payment.receiptUrl = `/receipts/${payment.paymentId}`;
      
      // Deduct credits if this was the first successful attempt
      if (payment.attempts === 1 && payment.creditsApplied > 0) {
        await User.findByIdAndUpdate(req.user._id, {
          $inc: { rewardsBalance: -payment.creditsApplied }
        });
      }
      
      await payment.save();
      
      res.json({
        message: "Payment successful",
        payment
      });
    } else {
      payment.status = "FAILED";
      payment.gatewayResponse = gatewayResult;
      await payment.save();
      
      res.status(400).json({
        message: "Payment failed",
        error: gatewayResult.error,
        payment
      });
    }
  } catch (error: any) {
    console.error('Retry payment error:', error);
    res.status(500).json({ 
      message: error.message || "Failed to retry payment" 
    });
  }
};

export const generateReceipt = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const payment = await Payment.findById(req.params.id);
    
    if (!payment) {
      return res.status(404).json({ message: "Payment not found" });
    }
    
    if (payment.userId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: "Access denied" });
    }
    
    if (payment.status !== "SUCCESS") {
      return res.status(400).json({ message: "Receipt can only be generated for successful payments" });
    }
    
    // Generate receipt data
    const receipt = {
      paymentId: payment.paymentId,
      billMonth: payment.billMonth,
      paidAt: payment.paidAt,
      items: payment.items,
      subtotal: payment.subtotal,
      creditsApplied: payment.creditsApplied,
      totalPayable: payment.totalPayable,
      paymentMethod: payment.paymentMethod,
      gatewayRef: payment.gatewayRef,
      receiptUrl: payment.receiptUrl
    };
    
    res.json({
      message: "Receipt generated successfully",
      receipt
    });
  } catch (error: any) {
    console.error('Generate receipt error:', error);
    res.status(500).json({ 
      message: error.message || "Failed to generate receipt" 
    });
  }
};

// Admin routes
export const getAllPayments = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { status, paymentMethod, page = 1, limit = 20 } = req.query;
    const skip = (Number(page) - 1) * Number(limit);
    
    const query: any = {};
    if (status) query.status = status;
    if (paymentMethod) query.paymentMethod = paymentMethod;
    
    const payments = await Payment.find(query)
      .populate('userId', 'name email phone')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(Number(limit));
    
    const total = await Payment.countDocuments(query);
    
    res.json({
      payments,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        pages: Math.ceil(total / Number(limit))
      }
    });
  } catch (error: any) {
    console.error('Get all payments error:', error);
    res.status(500).json({ 
      message: error.message || "Failed to get payments" 
    });
  }
};
