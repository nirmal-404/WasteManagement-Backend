import { Request, Response } from "express";
import { body, validationResult } from "express-validator";
import RequestModel from "../models/Request.js";
import User from "../models/User.js";
import Truck from "../models/Truck.js";
import { v4 as uuidv4 } from 'uuid';

interface AuthenticatedRequest extends Request {
  user?: any;
}

// Fee configuration
const FEE_CONFIG = {
  NORMAL: 800,
  SPECIAL_EQUIPPED: 1300,
  HAZARDOUS: 2000,
  BULKY_ITEMS: 1500,
  ELECTRONIC_WASTE: 1800
};

const WEIGHT_FEE_PER_KG = 50;
const URGENCY_FEE = {
  LOW: 0,
  MEDIUM: 200,
  HIGH: 500
};

// Validation middleware
export const createRequestValidation = [
  body('type').isIn(['NORMAL', 'SPECIAL_EQUIPPED', 'HAZARDOUS', 'BULKY_ITEMS', 'ELECTRONIC_WASTE']).withMessage('Invalid request type'),
  body('category').isIn(['HOUSEHOLD', 'GARDEN', 'CONSTRUCTION', 'MEDICAL', 'ELECTRONIC']).withMessage('Invalid category'),
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
const calculateFee = (requestData: any) => {
  let baseFee = FEE_CONFIG[requestData.type] || FEE_CONFIG.NORMAL;
  let weightFee = 0;
  let urgencyFee = URGENCY_FEE[requestData.urgency] || 0;
  
  if (requestData.estimatedWeight) {
    weightFee = requestData.estimatedWeight * WEIGHT_FEE_PER_KG;
  }
  
  const specialHandlingFee = requestData.type === 'HAZARDOUS' ? 500 : 0;
  
  return {
    baseFee,
    weightFee,
    specialHandlingFee,
    urgencyFee,
    total: baseFee + weightFee + specialHandlingFee + urgencyFee
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
      category: requestData.category,
      description: requestData.description,
      remarks: requestData.remarks,
      location: requestData.location,
      address: requestData.address,
      preferredDate: requestData.preferredDate ? new Date(requestData.preferredDate) : null,
      preferredTimeSlot: requestData.preferredTimeSlot || 'MORNING',
      urgency: requestData.urgency || 'MEDIUM',
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

export const approveRequest = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const request = await RequestModel.findById(req.params.id);
    
    if (!request) {
      return res.status(404).json({ message: "Request not found" });
    }
    
    if (request.status !== 'PENDING') {
      return res.status(400).json({ message: "Request is not pending" });
    }
    
    request.status = 'APPROVED';
    request.adminNotes = req.body.adminNotes || '';
    await request.save();
    
    res.json({
      message: "Request approved successfully",
      request: await RequestModel.findById(request._id).populate('userId', 'name email')
    });
  } catch (error: any) {
    console.error('Approve request error:', error);
    res.status(500).json({ 
      message: error.message || "Failed to approve request" 
    });
  }
};

export const rejectRequest = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { rejectionReason } = req.body;
    
    if (!rejectionReason) {
      return res.status(400).json({ message: "Rejection reason is required" });
    }
    
    const request = await RequestModel.findById(req.params.id);
    
    if (!request) {
      return res.status(404).json({ message: "Request not found" });
    }
    
    if (request.status !== 'PENDING') {
      return res.status(400).json({ message: "Request is not pending" });
    }
    
    request.status = 'REJECTED';
    request.rejectionReason = rejectionReason;
    request.adminNotes = req.body.adminNotes || '';
    await request.save();
    
    res.json({
      message: "Request rejected successfully",
      request: await RequestModel.findById(request._id).populate('userId', 'name email')
    });
  } catch (error: any) {
    console.error('Reject request error:', error);
    res.status(500).json({ 
      message: error.message || "Failed to reject request" 
    });
  }
};

export const scheduleRequest = async (req: AuthenticatedRequest, res: Response) => {
  try {
    // Check validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        message: "Validation failed", 
        errors: errors.array() 
      });
    }

    const { scheduledAt, driverId, vehicleId, collectors = [], equipment = [] } = req.body;
    
    const request = await RequestModel.findById(req.params.id);
    
    if (!request) {
      return res.status(404).json({ message: "Request not found" });
    }
    
    if (request.status !== 'APPROVED') {
      return res.status(400).json({ message: "Request must be approved before scheduling" });
    }
    
    // Verify driver and vehicle exist
    const driver = await User.findById(driverId);
    if (!driver || driver.role !== 'DRIVER') {
      return res.status(400).json({ message: "Invalid driver" });
    }
    
    const vehicle = await Truck.findById(vehicleId);
    if (!vehicle) {
      return res.status(400).json({ message: "Invalid vehicle" });
    }
    
    // Update request
    request.scheduledAt = new Date(scheduledAt);
    request.assigned = { 
      driverId, 
      vehicleId, 
      collectors, 
      equipment 
    };
    request.status = 'SCHEDULED';
    request.adminNotes = req.body.adminNotes || '';
    await request.save();
    
    res.json({
      message: "Request scheduled successfully",
      request: await RequestModel.findById(request._id)
        .populate('userId', 'name email phone')
        .populate('assigned.driverId', 'name phone')
        .populate('assigned.vehicleId', 'plateNo')
    });
  } catch (error: any) {
    console.error('Schedule request error:', error);
    res.status(500).json({ 
      message: error.message || "Failed to schedule request" 
    });
  }
};

export const updateRequestStatus = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { status } = req.body;
    const validStatuses = ['IN_PROGRESS', 'COMPLETED', 'CANCELLED'];
    
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ message: "Invalid status" });
    }
    
    const request = await RequestModel.findById(req.params.id);
    
    if (!request) {
      return res.status(404).json({ message: "Request not found" });
    }
    
    request.status = status;
    
    if (status === 'COMPLETED') {
      request.completedAt = new Date();
    }
    
    await request.save();
    
    res.json({
      message: `Request ${status.toLowerCase()} successfully`,
      request: await RequestModel.findById(request._id).populate('userId', 'name email')
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
