import { Request, Response } from "express";
import { body, validationResult } from "express-validator";
import RequestModel from "../models/Request.js";
import User from "../models/User.js";
import Truck from "../models/Truck.js";
import { v4 as uuidv4 } from 'uuid';
import { 
  notifyRequestApproved, 
  notifyRequestRejected, 
  notifyRequestScheduled,
  notifyStatusUpdate 
} from "../utils/notificationUtils.js";
import Bin from "../models/Bin.js";
import { WasteRecord } from "../models/WasteRecord.js";
import { PaymentBillModel } from "../models/PaymentBill.js";

interface AuthenticatedRequest extends Request {
  user?: any;
}

// Fee configuration
const FEE_CONFIG = {
  NORMAL: 800,
  SPECIAL_EQUIPPED: 1300
};

const WEIGHT_FEE_PER_KG = 50;
const URGENCY_FEE = {
  LOW: 0,
  MEDIUM: 200,
  HIGH: 500
};

// Validation middleware
export const createRequestValidation = [
  body('type').isIn(['NORMAL', 'SPECIAL_EQUIPPED']).withMessage('Invalid request type'),
  body('description').notEmpty().withMessage('Description is required'),
  body('address').notEmpty().withMessage('Address is required'),
  body('preferredDate').optional().isISO8601().withMessage('Invalid date format'),
  body('urgency').isIn(['LOW', 'MEDIUM', 'HIGH']).withMessage('Invalid urgency level')
];

export const scheduleRequestValidation = [
  body('scheduledAt').isISO8601().withMessage('Valid scheduled date is required'),
  body('driverId').notEmpty().withMessage('Driver ID is required'),
  body('vehicleId').notEmpty().withMessage('Vehicle ID is required')
];

// Calculate fee based on request details
interface RequestData {
  type: 'NORMAL' | 'SPECIAL_EQUIPPED';
  urgency: 'LOW' | 'MEDIUM' | 'HIGH';
  estimatedWeight?: number;
}

const calculateFee = (requestData: RequestData) => {
  let baseFee = FEE_CONFIG[requestData.type] || FEE_CONFIG.NORMAL;
  let weightFee = 0;
  let urgencyFee = URGENCY_FEE[requestData.urgency] || 0;
  
  if (requestData.estimatedWeight) {
    weightFee = requestData.estimatedWeight * WEIGHT_FEE_PER_KG;
  }
 
  return {
    baseFee,
    weightFee,
    urgencyFee,
    total: baseFee + weightFee + urgencyFee
  };
};

export const createRequest = async (req: AuthenticatedRequest, res: Response) => {
  try {
    // Check validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        message: "Validation failed", 
        errors: errors.array() 
      });
    }

    const requestData = req.body;
    
    // Calculate fee
    const feeBreakdown = calculateFee(requestData);
    
    // Generate unique request ID
    const requestId = `REQ-${Date.now()}-${uuidv4().substring(0, 8).toUpperCase()}`;
    
    const request = await RequestModel.create({
      requestId,
      userId: req.user._id,
      type: requestData.type,
      description: requestData.description,
      remarks: requestData.remarks,
      address: requestData.address,
      preferredDate: requestData.preferredDate ? new Date(requestData.preferredDate) : null,
      preferredTimeSlot: requestData.preferredTimeSlot || 'MORNING',
      urgency: requestData.urgency || 'LOW',
      estimatedWeight: requestData.estimatedWeight,
      estimatedVolume: requestData.estimatedVolume,
      fee: feeBreakdown.total,
      feeBreakdown
    });
    
    res.status(201).json({
      message: "Request created successfully",
      request: await RequestModel.findById(request._id).populate('userId', 'name email phone')
    });
  } catch (error: any) {
    console.error('Create request error:', error);
    res.status(500).json({ 
      message: error.message || "Failed to create request" 
    });
  }
};

export const myRequests = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { status, page = 1, limit = 10 } = req.query;
    const skip = (Number(page) - 1) * Number(limit);
    
    const query: any = { userId: req.user._id };
    if (status) {
      query.status = status;
    }
    
    const requests = await RequestModel.find(query)
      .populate('assigned.driverId', 'name phone')
      .populate('assigned.vehicleId', 'plateNo')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(Number(limit));
    
    const total = await RequestModel.countDocuments(query);
    
    res.json({
      requests,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        pages: Math.ceil(total / Number(limit))
      }
    });
  } catch (error: any) {
    console.error('Get my requests error:', error);
    res.status(500).json({ 
      message: error.message || "Failed to get requests" 
    });
  }
};

export const allRequests = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { status, type, urgency, page = 1, limit = 20 } = req.query;
    const skip = (Number(page) - 1) * Number(limit);
    
    const query: any = {};
    if (status) query.status = status;
    if (type) query.type = type;
    if (urgency) query.urgency = urgency;
    
    const requests = await RequestModel.find(query)
      .populate("userId", "name email phone address")
      .populate('assigned.driverId', 'name phone')
      .populate('assigned.vehicleId', 'plateNo')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(Number(limit));
    
    const total = await RequestModel.countDocuments(query);
    
    res.json({
      requests,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        pages: Math.ceil(total / Number(limit))
      }
    });
  } catch (error: any) {
    console.error('Get all requests error:', error);
    res.status(500).json({ 
      message: error.message || "Failed to get requests" 
    });
  }
};

export const getRequestById = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const request = await RequestModel.findById(req.params.id)
      .populate("userId", "name email phone address zone")
      .populate('assigned.driverId', 'name phone')
      .populate('assigned.vehicleId', 'plateNo capacityKg')
      .populate('assigned.collectors', 'name phone');
    
    if (!request) {
      return res.status(404).json({ message: "Request not found" });
    }
    
    res.json({ request });
  } catch (error: any) {
    console.error('Get request error:', error);
    res.status(500).json({ 
      message: error.message || "Failed to get request" 
    });
  }
};

//Approve Request
export const approveRequest = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { adminNotes, sendNotification } = req.body;

    const request = await RequestModel.findById(req.params.id);
    if (!request) {
      return res.status(404).json({ message: "Request not found" });
    }

    if (request.status !== 'PENDING') {
      return res.status(400).json({ message: "Only pending requests can be approved" });
    }

    request.status = 'APPROVED';
    if (adminNotes) request.adminNotes = adminNotes;
    await request.save();

    // Send notification to user
    if (sendNotification) {
      await notifyRequestApproved(
        request.userId.toString(),
        request._id.toString(),
        request.requestId
      );
    }

    // Auto-create WasteRecord and PaymentBill
    try {
      // Find user's bin if exists (take first bin by user)
      const userBins = await Bin.find({ userId: request.userId }).sort({ createdAt: -1 }).limit(1);
      const bin = userBins[0];

      const recordId = `WR-${Date.now()}-${uuidv4().substring(0, 6).toUpperCase()}`;
      const weight = request.estimatedWeight || 0;
      const wasteType = (bin as any)?.wasteType || undefined;
      const totalAmount = request.fee || 0;

      const wasteRecord = await WasteRecord.create({
        recordId,
        userId: request.userId,
        binId: bin?._id,
        weight,
        wasteType,
        totalAmount,
        description: request.description
      });

      const billId = `BILL-${Date.now()}-${uuidv4().substring(0, 6).toUpperCase()}`;
      const discountAmount = 0;
      const finalAmount = totalAmount - discountAmount;

      const bill = await PaymentBillModel.create({
        billId,
        userId: request.userId,
        wasteRecordId: wasteRecord._id,
        totalAmount,
        paidAmount: 0,
        status: 'pending'
      });

      res.json({ 
        message: "Request approved successfully",
        request,
        wasteRecord,
        bill
      });
    } catch (autoError: any) {
      console.error('Auto create WasteRecord/Bill error:', autoError);
      // Still respond success for approval, but include warning
      res.json({ 
        message: "Request approved successfully (record/bill creation failed)",
        request
      });
    }
  } catch (error: any) {
    console.error('Approve request error:', error);
    res.status(500).json({ 
      message: error.message || "Failed to approve request" 
    });
  }
};

// Reject request
export const rejectRequest = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { rejectionReason, adminNotes, sendNotification } = req.body;

    if (!rejectionReason) {
      return res.status(400).json({ message: "Rejection reason is required" });
    }

    const request = await RequestModel.findById(req.params.id);
    if (!request) {
      return res.status(404).json({ message: "Request not found" });
    }

    if (request.status !== 'PENDING' && request.status !== 'APPROVED') {
      return res.status(400).json({ message: "Only pending or approved requests can be rejected" });
    }

    request.status = 'REJECTED';
    request.rejectionReason = rejectionReason;
    if (adminNotes) request.adminNotes = adminNotes;
    await request.save();

    // Send notification to user
    if (sendNotification !== false) {
      await notifyRequestRejected(
        request.userId.toString(),
        request._id.toString(),
        request.requestId,
        rejectionReason
      );
    }

    res.json({ 
      message: "Request rejected successfully",
      request 
    });
  } catch (error: any) {
    console.error('Reject request error:', error);
    res.status(500).json({ 
      message: error.message || "Failed to reject request" 
    });
  }
};

// Schedule request
export const scheduleRequest = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { 
      scheduledAt, 
      driverId, 
      vehicleId, 
      collectors, 
      equipment, 
      adminNotes,
      sendNotification 
    } = req.body;

    if (!scheduledAt || !driverId || !vehicleId) {
      return res.status(400).json({ 
        message: "Scheduled date/time, driver, and vehicle are required" 
      });
    }

    const request = await RequestModel.findById(req.params.id)
      .populate('userId', 'name email phone');
      
    if (!request) {
      return res.status(404).json({ message: "Request not found" });
    }

    if (request.status !== 'APPROVED') {
      return res.status(400).json({ message: "Only approved requests can be scheduled" });
    }

    request.status = 'SCHEDULED';
    request.scheduledAt = new Date(scheduledAt);
    request.assigned = {
      driverId,
      vehicleId,
      collectors: collectors || [],
      equipment: equipment || []
    };
    if (adminNotes) request.adminNotes = adminNotes;

    await request.save();

    // Populate the assigned fields for response
    await request.populate([
      { path: 'assigned.driverId', select: 'name phone' },
      { path: 'assigned.vehicleId', select: 'plateNo capacityKg' },
      { path: 'assigned.collectors', select: 'name phone' }
    ]);

    // Send notification to user
    if (sendNotification) {
      const scheduledDate = new Date(scheduledAt).toLocaleString();
      const driverName = (request.assigned.driverId as any)?.name;
      
      await notifyRequestScheduled(
        request.userId._id.toString(),
        request._id.toString(),
        request.requestId,
        scheduledDate,
        driverName
      );
    }

    res.json({ 
      message: "Request scheduled successfully",
      request 
    });
  } catch (error: any) {
    console.error('Schedule request error:', error);
    res.status(500).json({ 
      message: error.message || "Failed to schedule request" 
    });
  }
};

// Update request status (for collectors/drivers)
export const updateRequestStatus = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { status } = req.body;

    if (!['IN_PROGRESS', 'COMPLETED', 'CANCELLED'].includes(status)) {
      return res.status(400).json({ 
        message: "Invalid status. Allowed: IN_PROGRESS, COMPLETED, CANCELLED" 
      });
    }

    const request = await RequestModel.findById(req.params.id)
      .populate('userId', 'name email phone');
      
    if (!request) {
      return res.status(404).json({ message: "Request not found" });
    }

    request.status = status;
    await request.save();

    // Send notification to user based on status
    await notifyStatusUpdate(
      request.userId._id.toString(),
      request._id.toString(),
      request.requestId,
      status
    );

    res.json({ 
      message: "Request status updated successfully",
      request 
    });
  } catch (error: any) {
    console.error('Update request status error:', error);
    res.status(500).json({ 
      message: error.message || "Failed to update request status" 
    });
  }
};

export const submitRating = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { rating, feedback } = req.body;
    
    if (!rating || rating < 1 || rating > 5) {
      return res.status(400).json({ message: "Rating must be between 1 and 5" });
    }
    
    const request = await RequestModel.findById(req.params.id);
    
    if (!request) {
      return res.status(404).json({ message: "Request not found" });
    }
    
    if (request.userId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: "Access denied" });
    }
    
    if (request.status !== 'COMPLETED') {
      return res.status(400).json({ message: "Can only rate completed requests" });
    }
    
    request.customerRating = {
      rating,
      feedback: feedback || '',
      submittedAt: new Date()
    };
    
    await request.save();
    
    res.json({
      message: "Rating submitted successfully",
      request
    });
  } catch (error: any) {
    console.error('Submit rating error:', error);
    res.status(500).json({ 
      message: error.message || "Failed to submit rating" 
    });
  }
};
