import mongoose from 'mongoose'

const truckSchema = new mongoose.Schema(
  {
    plateNo: {
      type: String,
      required: true,
      unique: true
    },
    capacityKg: {
      type: Number,
      default: 1000
    },
    driverId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    active: {
      type: Boolean,
      default: true
    }
  },
  { timestamps: true }
)

export default mongoose.model('Truck', truckSchema)
