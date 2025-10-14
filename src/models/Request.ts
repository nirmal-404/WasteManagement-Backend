import mongoose from 'mongoose';

const requestSchema = new mongoose.Schema(
  {
    requestId: {
      type: String,
      required: true,
      unique: true
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    type: {
      type: String,
      enum: ['NORMAL', 'SPECIAL_EQUIPPED', 'HAZARDOUS', 'BULKY_ITEMS', 'ELECTRONIC_WASTE'],
      default: 'NORMAL'
    },
    category: {
      type: String,
      enum: ['HOUSEHOLD', 'GARDEN', 'CONSTRUCTION', 'MEDICAL', 'ELECTRONIC'],
      required: true
    },
    description: {
      type: String,
      required: true
    },
    remarks: String,
    location: {
      type: String,
      required: true
    },
    address: {
      type: String,
      required: true
    },
    preferredDate: Date,
    preferredTimeSlot: {
      type: String,
      enum: ['MORNING', 'AFTERNOON', 'EVENING'],
      default: 'MORNING'
    },
    urgency: {
      type: String,
      enum: ['LOW', 'MEDIUM', 'HIGH'],
      default: 'MEDIUM'
    },
    estimatedWeight: Number, // in kg
    estimatedVolume: Number, // in cubic meters
    status: {
      type: String,
      enum: ['PENDING', 'APPROVED', 'REJECTED', 'SCHEDULED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED'],
      default: 'PENDING'
    },
    scheduledAt: Date,
    completedAt: Date,
    assigned: {
      driverId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
      },
      vehicleId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Truck'
      },
      collectors: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
      }],
      equipment: [String],
      routeId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Route'
      }
    },
    fee: {
      type: Number,
      default: 0
    },
    feeBreakdown: {
      baseFee: { type: Number, default: 0 },
      weightFee: { type: Number, default: 0 },
      specialHandlingFee: { type: Number, default: 0 },
      urgencyFee: { type: Number, default: 0 },
      total: { type: Number, default: 0 }
    },
    rejectionReason: String,
    adminNotes: String,
    customerRating: {
      rating: { type: Number, min: 1, max: 5 },
      feedback: String,
      submittedAt: Date
    }
  },
  { timestamps: true }
);

export default mongoose.model('Request', requestSchema);
