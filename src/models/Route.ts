import mongoose from 'mongoose';

const routePointSchema = new mongoose.Schema({
  binId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Bin'
  },
  location: {
    type: String,
    required: true
  },
  address: {
    type: String,
    required: true
  },
  order: {
    type: Number,
    required: true
  },
  collected: {
    type: Boolean,
    default: false
  },
  collectedAt: Date,
  notes: String
}, { _id: false });

const routeSchema = new mongoose.Schema({
  routeId: {
    type: String,
    required: true,
    unique: true
  },
  name: {
    type: String,
    required: true
  },
  description: String,
  assignedTruckId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Truck'
  },
  assignedDriverId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  assignedCollectors: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  points: [routePointSchema],
  status: {
    type: String,
    enum: ['PLANNED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED'],
    default: 'PLANNED'
  },
  scheduledDate: {
    type: Date,
    required: true
  },
  startedAt: Date,
  completedAt: Date,
  estimatedDuration: Number, // in minutes
  actualDuration: Number, // in minutes
  totalDistance: Number, // in km
  totalWeight: Number, // in kg
  notes: String
}, { timestamps: true });

export default mongoose.model('Route', routeSchema);
