import { PaymentBillModel, IPaymentBill } from '../models/PaymentBill'
import { Types } from 'mongoose'

export class PaymentBillService {
  async create(data: Partial<IPaymentBill>) {
    const bill = new PaymentBillModel(data)
    return bill.save()
  }

  async findById(id: string) {
    if (!Types.ObjectId.isValid(id)) throw new Error('Invalid ID')
    return PaymentBillModel.findById(id)
      .populate('userId', 'name email')
      .populate('wasteRecordId', 'recordId totalAmount')
  }

  async findByBillId(billId: string) {
    return PaymentBillModel.findOne({ billId })
  }

  async findAll() {
    return PaymentBillModel.find()
      .populate('userId', 'name email')
      .populate('wasteRecordId', 'recordId totalAmount')
  }

  async update(id: string, updates: Partial<IPaymentBill>) {
    if (!Types.ObjectId.isValid(id)) throw new Error('Invalid ID')
    return PaymentBillModel.findByIdAndUpdate(id, updates, { new: true })
  }

  async delete(id: string) {
    if (!Types.ObjectId.isValid(id)) throw new Error('Invalid ID')
    return PaymentBillModel.findByIdAndDelete(id)
  }
}
