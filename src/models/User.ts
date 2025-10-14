import mongoose from 'mongoose';

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true
    },
    password: {
      type: String,
      required: true
    },
    role: {
      type: String,
      enum: ['ADMIN', 'RESIDENT', 'BUSINESS', 'COLLECTOR', 'DRIVER'],
      default: 'RESIDENT'
    },
    phone: {
      type: String,
      required: true
    },
    address: {
      type: String,
      required: true
    },
    zone: {
      type: String,
      required: true
    },
    rewardsBalance: {
      type: Number,
      default: 0
    },
    isActive: {
      type: Boolean,
      default: true
    },
    profileImage: String,
    emergencyContact: {
      name: String,
      phone: String,
      relationship: String
    },
    preferences: {
      notifications: {
        email: { type: Boolean, default: true },
        sms: { type: Boolean, default: true },
        push: { type: Boolean, default: true }
      },
      language: { type: String, default: 'en' }
    },
    lastLoginAt: Date,
    emailVerified: { type: Boolean, default: false },
    phoneVerified: { type: Boolean, default: false }
  },
  { timestamps: true }
);

export default mongoose.model('User', userSchema);
