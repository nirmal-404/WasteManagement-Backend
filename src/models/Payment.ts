import mongoose from 'mongoose';

const paymentItemSchema = new mongoose.Schema({
  type: {
    type: String,
    enum: ['MONTHLY_FEE', 'SPECIAL_COLLECTION', 'FINE', 'PENALTY', 'OTHER'],
    required: true
  },
  description: {
    type: String,
    required: true
  },
  amount: {
    type: Number,
    required: true
  },
  requestId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Request'
  },
  wasteRecordId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'WasteRecord'
  }
}, { _id: false });

const paymentSchema = new mongoose.Schema(
  {
    paymentId: {
      type: String,
      required: true,
      unique: true
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    billMonth: {
      type: String,
      required: true
    }, // e.g., "2025-10"
    items: [paymentItemSchema],
    subtotal: {
      type: Number,
      default: 0
    },
    discountApplied: {
      type: Number,
      default: 0
    },
    creditsApplied: {
      type: Number,
      default: 0
    },
    totalPayable: {
      type: Number,
      default: 0
    },
    status: {
      type: String,
      enum: ['PENDING', 'PROCESSING', 'SUCCESS', 'FAILED', 'CANCELLED', 'REFUNDED', 'BLOCKED'],
      default: 'PENDING'
    },
    paymentMethod: {
      type: String,
      enum: ['CARD', 'BANK_TRANSFER', 'WALLET', 'CASH'],
      default: 'CARD'
    },
    attempts: {
      type: Number,
      default: 0
    },
    maxAttempts: {
      type: Number,
      default: 3
    },
    blockedUntil: Date,
    receiptUrl: String,
    gatewayRef: String,
    gatewayResponse: mongoose.Schema.Types.Mixed,
    paidAt: Date,
    dueDate: {
      type: Date,
      required: true
    },
    lateFee: {
      type: Number,
      default: 0
    },
    notes: String,
    refundDetails: {
      refundId: String,
      refundAmount: Number,
      refundReason: String,
      refundedAt: Date,
      gatewayRefundRef: String
    }
  },
  { timestamps: true }
);

export default mongoose.model('Payment', paymentSchema);
