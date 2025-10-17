import { PaymentBillService } from '../services/paymentBill.service'
import { PaymentBillModel } from '../models/PaymentBill'
import { Types } from 'mongoose'

jest.mock('../models/PaymentBill')

const mockPaymentBill = PaymentBillModel as jest.Mocked<typeof PaymentBillModel>
const service = new PaymentBillService()

describe('PaymentBillService', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('create', () => {
    it('should create and save a new bill', async () => {
      const saveMock = jest.fn().mockResolvedValue({ _id: '1', billId: 'BILL-001' })
      mockPaymentBill.mockImplementationOnce(() => ({ save: saveMock } as any))

      const result = await service.create({ billId: 'BILL-001' } as any)
      expect(result.billId).toBe('BILL-001')
    })
  })

  describe('findById', () => {
    it('should throw error for invalid id', async () => {
      await expect(service.findById('bad-id')).rejects.toThrow('Invalid ID')
    })

    it('should return populated bill for valid id', async () => {
      const validId = new Types.ObjectId().toString()

      const resolvedValue = { _id: validId }

      const queryMock: any = {
        populate: jest.fn().mockReturnThis(),
        then: (cb: any) => cb(resolvedValue) // 👈 simulate thenable
      }

      mockPaymentBill.findById.mockReturnValue(queryMock)
      queryMock.populate.mockReturnValue(queryMock)

      const result = await service.findById(validId)
      expect(result._id).toBe(validId)
      expect(queryMock.populate).toHaveBeenCalledTimes(2)
    })
  })

  describe('findByBillId', () => {
    it('should return a bill by billId', async () => {
      mockPaymentBill.findOne.mockResolvedValue({ _id: '1', billId: 'BILL-001' } as any)
      const result = await service.findByBillId('BILL-001')
      expect(result.billId).toBe('BILL-001')
    })
  })

  describe('findAll', () => {
    it('should return all bills', async () => {
      const resolvedValue = [{ _id: '1' }]
      const queryMock: any = {
        populate: jest.fn().mockReturnThis(),
        then: (cb: any) => cb(resolvedValue) // 👈 simulate thenable
      }

      mockPaymentBill.find.mockReturnValue(queryMock)
      queryMock.populate.mockReturnValue(queryMock)

      const result = await service.findAll()
      expect(result[0]._id).toBe('1')
      expect(queryMock.populate).toHaveBeenCalledTimes(2)
    })
  })

  describe('update', () => {
    it('should throw error for invalid id', async () => {
      await expect(service.update('bad-id', {} as any)).rejects.toThrow('Invalid ID')
    })

    it('should update bill', async () => {
      const validId = new Types.ObjectId().toString()
      mockPaymentBill.findByIdAndUpdate.mockResolvedValue({ _id: validId, billId: 'BILL-002' } as any)

      const result = await service.update(validId, { billId: 'BILL-002' })
      expect(result.billId).toBe('BILL-002')
    })
  })

  describe('delete', () => {
    it('should throw error for invalid id', async () => {
      await expect(service.delete('bad-id')).rejects.toThrow('Invalid ID')
    })

    it('should delete bill', async () => {
      const validId = new Types.ObjectId().toString()
      mockPaymentBill.findByIdAndDelete.mockResolvedValue({ _id: validId } as any)

      const result = await service.delete(validId)
      expect(result._id).toBe(validId)
    })
  })
})
