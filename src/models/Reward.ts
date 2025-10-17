import { Schema, model, Document, Types } from 'mongoose';

export interface IReward extends Document {
  userId: Types.ObjectId;
  points: number;
  expiryDate: Date;
  updatedAt?: Date;
  createdAt?: Date;
}

const rewardSchema = new Schema<IReward>({
  userId: { type: Schema.Types.ObjectId, ref: 'User', unique: true, required: true },
  points: { type: Number, default: 0 },
  expiryDate: { type: Date, required: true },
}, { timestamps: true });

export const Reward = model<IReward>('Reward', rewardSchema);


