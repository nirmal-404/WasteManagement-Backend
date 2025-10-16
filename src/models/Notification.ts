import mongoose from 'mongoose';

const notificationSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true
    },
    message: {
      type: String,
      required: true
    },
    type: {
      type: String,
      enum: ['success', 'info', 'warning', 'error'],
      default: 'info'
    },
    requestId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Request'
    },
    read: {
      type: Boolean,
      default: false
    },
    metadata: {
      action: String,
      details: mongoose.Schema.Types.Mixed
    }
  },
  { timestamps: true }
);

// Index for efficient queries
notificationSchema.index({ userId: 1, read: 1, createdAt: -1 });

export default mongoose.model('Notification', notificationSchema);