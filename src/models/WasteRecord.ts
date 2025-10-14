import mongoose from 'mongoose'

const detailSchema = new mongoose.Schema(
  {
    binId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Bin'
    },
    type: String,
    collectedAt: Date,
    weightKg: Number
  },
  { _id: false }
)

const wasteRecordSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    month: {
      type: String,
      required: true
    }, // e.g., "2025-10"
    details: [detailSchema],
    specialFees: {
      type: Number,
      default: 0
    },
    fines: {
      type: Number,
      default: 0
    }
  },
  { timestamps: true }
)

export default mongoose.model('WasteRecord', wasteRecordSchema)
