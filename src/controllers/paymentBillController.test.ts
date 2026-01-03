import { Request, Response } from 'express';
import { Types } from 'mongoose';

// Mock all dependencies before importing the controller
jest.mock('../models/PaymentBill');
jest.mock('../models/Reward');
jest.mock('../models/Notification', () => ({
  default: {
    find: jest.fn(),
    findOne: jest.fn(),
    create: jest.fn(),
    findOneAndDelete: jest.fn()
  }
}));
jest.mock('../utils/notificationUtils', () => ({
  createNotification: jest.fn()
}));

import * as paymentBillController from './paymentBillController';
import { PaymentBillModel } from '../models/PaymentBill';
import { Reward } from '../models/Reward';
import { createNotification } from '../utils/notificationUtils';

const mockResponse = () => {
  const res = {} as Response;
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
};

describe('paymentBillController', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('createPaymentBill', () => {
    it('should create a payment bill successfully', async () => {
      const req = {
        body: {
          billId: 'BILL001',
          userId: new Types.ObjectId(),
          wasteRecordId: new Types.ObjectId(),
          totalAmount: 100,
          status: 'pending'
        }
      } as unknown as Request;

      const res = mockResponse();
      const mockBill = { _id: '1', ...req.body };

      (PaymentBillModel.create as jest.Mock).mockResolvedValue(mockBill);

      await paymentBillController.createPaymentBill(req, res);

      expect(PaymentBillModel.create).toHaveBeenCalledWith(req.body);
      expect(res.json).toHaveBeenCalledWith(mockBill);
    });

    it('should return 500 if creation fails', async () => {
      const req = {
        body: {}
      } as unknown as Request;
      const res = mockResponse();

      (PaymentBillModel.create as jest.Mock).mockRejectedValue(new Error('DB error'));

      await paymentBillController.createPaymentBill(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ message: expect.any(String) })
      );
    });
  });

  describe('getAllPaymentBills', () => {
    it('should return all payment bills successfully', async () => {
      const req = {} as Request;
      const res = mockResponse();
      const mockBills = [{ _id: '1', billId: 'BILL001' }];

      const populateMock = jest.fn().mockResolvedValue(mockBills);
      (PaymentBillModel.find as jest.Mock).mockReturnValue({
        populate: jest.fn().mockReturnValue({
          populate: populateMock
        })
      });

      await paymentBillController.getAllPaymentBills(req, res);

      expect(PaymentBillModel.find).toHaveBeenCalled();
      expect(res.json).toHaveBeenCalledWith(mockBills);
    });

    it('should handle errors', async () => {
      const req = {} as Request;
      const res = mockResponse();

      (PaymentBillModel.find as jest.Mock).mockImplementation(() => {
        throw new Error('DB error');
      });

      await paymentBillController.getAllPaymentBills(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
    });
  });

  describe('getPaymentBillById', () => {
    it('should return a bill by id successfully', async () => {
      const validId = new Types.ObjectId().toString();
      const req = {
        params: { id: validId }
      } as unknown as Request;
      const res = mockResponse();
      const mockBill = { _id: validId, billId: 'BILL001' };

      const populateMock = jest.fn().mockResolvedValue(mockBill);
      (PaymentBillModel.findById as jest.Mock).mockReturnValue({
        populate: jest.fn().mockReturnValue({
          populate: populateMock
        })
      });

      await paymentBillController.getPaymentBillById(req, res);

      expect(res.json).toHaveBeenCalledWith(mockBill);
    });

    it('should return 400 if id is invalid', async () => {
      const req = {
        params: { id: 'invalid-id' }
      } as unknown as Request;
      const res = mockResponse();

      await paymentBillController.getPaymentBillById(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ message: 'Invalid ID' });
    });

    it('should return 400 if id is missing', async () => {
      const req = {
        params: {}
      } as unknown as Request;
      const res = mockResponse();

      await paymentBillController.getPaymentBillById(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ message: 'Invalid ID' });
    });

    it('should return 404 if bill not found', async () => {
      const validId = new Types.ObjectId().toString();
      const req = {
        params: { id: validId }
      } as unknown as Request;
      const res = mockResponse();

      const populateMock = jest.fn().mockResolvedValue(null);
      (PaymentBillModel.findById as jest.Mock).mockReturnValue({
        populate: jest.fn().mockReturnValue({
          populate: populateMock
        })
      });

      await paymentBillController.getPaymentBillById(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({ message: 'Not found' });
    });
  });

  describe('updatePaymentBill', () => {
    it('should update a bill successfully', async () => {
      const validId = new Types.ObjectId().toString();
      const req = {
        params: { id: validId },
        body: { status: 'paid' }
      } as unknown as Request;
      const res = mockResponse();
      const mockBill = { _id: validId, status: 'paid' };

      (PaymentBillModel.findByIdAndUpdate as jest.Mock).mockResolvedValue(mockBill);

      await paymentBillController.updatePaymentBill(req, res);

      expect(PaymentBillModel.findByIdAndUpdate).toHaveBeenCalledWith(
        validId,
        req.body,
        { new: true }
      );
      expect(res.json).toHaveBeenCalledWith(mockBill);
    });

    it('should return 400 if id is invalid', async () => {
      const req = {
        params: { id: 'invalid' },
        body: {}
      } as unknown as Request;
      const res = mockResponse();

      await paymentBillController.updatePaymentBill(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ message: 'Invalid ID' });
    });

    it('should return 404 if bill not found', async () => {
      const validId = new Types.ObjectId().toString();
      const req = {
        params: { id: validId },
        body: {}
      } as unknown as Request;
      const res = mockResponse();

      (PaymentBillModel.findByIdAndUpdate as jest.Mock).mockResolvedValue(null);

      await paymentBillController.updatePaymentBill(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({ message: 'Not found' });
    });
  });

  describe('deletePaymentBill', () => {
    it('should delete a bill successfully', async () => {
      const validId = new Types.ObjectId().toString();
      const req = {
        params: { id: validId }
      } as unknown as Request;
      const res = mockResponse();
      const mockBill = { _id: validId };

      (PaymentBillModel.findByIdAndDelete as jest.Mock).mockResolvedValue(mockBill);

      await paymentBillController.deletePaymentBill(req, res);

      expect(PaymentBillModel.findByIdAndDelete).toHaveBeenCalledWith(validId);
      expect(res.json).toHaveBeenCalledWith({ message: 'Deleted' });
    });

    it('should return 400 if id is invalid', async () => {
      const req = {
        params: { id: 'invalid' }
      } as unknown as Request;
      const res = mockResponse();

      await paymentBillController.deletePaymentBill(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
    });

    it('should return 404 if bill not found', async () => {
      const validId = new Types.ObjectId().toString();
      const req = {
        params: { id: validId }
      } as unknown as Request;
      const res = mockResponse();

      (PaymentBillModel.findByIdAndDelete as jest.Mock).mockResolvedValue(null);

      await paymentBillController.deletePaymentBill(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
    });
  });

  describe('getMyBills', () => {
    it('should return user bills successfully', async () => {
      const userId = new Types.ObjectId();
      const req = {
        user: { _id: userId }
      } as any;
      const res = mockResponse();
      const mockBills = [{ _id: '1', billId: 'BILL001' }];

      (PaymentBillModel.find as jest.Mock).mockReturnValue({
        populate: jest.fn().mockReturnThis(),
        sort: jest.fn().mockResolvedValue(mockBills)
      });

      await paymentBillController.getMyBills(req, res);

      expect(PaymentBillModel.find).toHaveBeenCalledWith({ userId });
      expect(res.json).toHaveBeenCalledWith({ bills: mockBills });
    });

    it('should return 400 if user is invalid', async () => {
      const req = {
        user: { _id: 'invalid-id' }
      } as any;
      const res = mockResponse();

      await paymentBillController.getMyBills(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ message: 'Invalid user' });
    });

    it('should return 400 if user is missing', async () => {
      const req = {} as any;
      const res = mockResponse();

      await paymentBillController.getMyBills(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
    });

    it('should handle database errors', async () => {
      const userId = new Types.ObjectId();
      const req = {
        user: { _id: userId }
      } as any;
      const res = mockResponse();

      (PaymentBillModel.find as jest.Mock).mockReturnValue({
        populate: jest.fn().mockReturnThis(),
        sort: jest.fn().mockRejectedValue(new Error('DB error'))
      });

      await paymentBillController.getMyBills(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
    });
  });

  describe('payBill', () => {
    it('should pay a bill successfully without reward redemption', async () => {
      const userId = new Types.ObjectId();
      const billId = new Types.ObjectId().toString();
      const req = {
        user: { _id: userId },
        params: { id: billId },
        body: {}
      } as any;
      const res = mockResponse();
      const mockBill = {
        _id: billId,
        billId: 'BILL001',
        userId,
        totalAmount: 100,
        status: 'pending',
        save: jest.fn().mockResolvedValue(true)
      };

      (PaymentBillModel.findOne as jest.Mock).mockResolvedValue(mockBill);
      (Reward.findOne as jest.Mock).mockResolvedValue(null);
      (Reward.create as jest.Mock).mockResolvedValue({});
      (createNotification as jest.Mock).mockResolvedValue({});

      await paymentBillController.payBill(req, res);

      expect(mockBill.status).toBe('paid');
      expect(mockBill.paidAmount).toBe(100);
      expect(mockBill.save).toHaveBeenCalled();
      expect(Reward.create).toHaveBeenCalledWith(
        expect.objectContaining({
          userId,
          points: 1, // 1% of 100
          expiryDate: expect.any(Date)
        })
      );
      expect(createNotification).toHaveBeenCalled();
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Bill paid successfully',
          bill: mockBill,
          redeemed: 0
        })
      );
    });

    it('should pay a bill with reward redemption', async () => {
      const userId = new Types.ObjectId();
      const billId = new Types.ObjectId().toString();
      const req = {
        user: { _id: userId },
        params: { id: billId },
        body: { redeem: 50 }
      } as any;
      const res = mockResponse();
      const mockBill = {
        _id: billId,
        billId: 'BILL001',
        userId,
        totalAmount: 100,
        status: 'pending',
        save: jest.fn().mockResolvedValue(true)
      };
      const mockReward = {
        userId,
        points: 80,
        expiryDate: new Date(Date.now() + 1000000),
        save: jest.fn().mockResolvedValue(true)
      };

      (PaymentBillModel.findOne as jest.Mock).mockResolvedValue(mockBill);
      (Reward.findOne as jest.Mock).mockResolvedValue(mockReward);
      (createNotification as jest.Mock).mockResolvedValue({});

      await paymentBillController.payBill(req, res);

      expect(mockReward.points).toBe(30); // 80 - 50
      expect(mockReward.save).toHaveBeenCalled();
      expect(mockBill.paidAmount).toBe(50); // 100 - 50
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          redeemed: 50
        })
      );
    });

    it('should limit redemption to available points', async () => {
      const userId = new Types.ObjectId();
      const billId = new Types.ObjectId().toString();
      const req = {
        user: { _id: userId },
        params: { id: billId },
        body: { redeem: 100 }
      } as any;
      const res = mockResponse();
      const mockBill = {
        _id: billId,
        billId: 'BILL001',
        userId,
        totalAmount: 200,
        status: 'pending',
        save: jest.fn().mockResolvedValue(true)
      };
      const mockReward = {
        userId,
        points: 50,
        expiryDate: new Date(Date.now() + 1000000),
        save: jest.fn().mockResolvedValue(true)
      };

      (PaymentBillModel.findOne as jest.Mock).mockResolvedValue(mockBill);
      // Reward.findOne is called twice - once for redemption, once for granting
      (Reward.findOne as jest.Mock)
        .mockResolvedValueOnce(mockReward) // First call for redemption
        .mockResolvedValueOnce(mockReward); // Second call for granting
      (createNotification as jest.Mock).mockResolvedValue({});

      await paymentBillController.payBill(req, res);

      expect(mockReward.points).toBe(1); // 50 - 50 + 1 (1% of 150)
      expect(mockBill.paidAmount).toBe(150); // 200 - 50
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          redeemed: 50
        })
      );
    });

    it('should not redeem expired rewards', async () => {
      const userId = new Types.ObjectId();
      const billId = new Types.ObjectId().toString();
      const req = {
        user: { _id: userId },
        params: { id: billId },
        body: { redeem: 50 }
      } as any;
      const res = mockResponse();
      const mockBill = {
        _id: billId,
        billId: 'BILL001',
        userId,
        totalAmount: 100,
        status: 'pending',
        save: jest.fn().mockResolvedValue(true)
      };
      const expiredReward = {
        userId,
        points: 80,
        expiryDate: new Date(Date.now() - 1000000), // Expired
        save: jest.fn().mockResolvedValue(true)
      };

      (PaymentBillModel.findOne as jest.Mock).mockResolvedValue(mockBill);
      // First call: expired reward (won't be redeemed)
      // Second call: same reward will be used for granting and extending expiry
      (Reward.findOne as jest.Mock)
        .mockResolvedValueOnce(expiredReward)
        .mockResolvedValueOnce(expiredReward);
      (createNotification as jest.Mock).mockResolvedValue({});

      await paymentBillController.payBill(req, res);

      // Reward is saved once for granting points (not for redemption since it's expired)
      expect(expiredReward.save).toHaveBeenCalledTimes(1);
      expect(mockBill.paidAmount).toBe(100); // No redemption
      expect(expiredReward.points).toBe(81); // 80 + 1 (1% of 100)
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          redeemed: 0
        })
      );
    });

    it('should return 400 if bill id is invalid', async () => {
      const userId = new Types.ObjectId();
      const req = {
        user: { _id: userId },
        params: { id: 'invalid' },
        body: {}
      } as any;
      const res = mockResponse();

      await paymentBillController.payBill(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ message: 'Invalid ID' });
    });

    it('should return 400 if user is invalid', async () => {
      const req = {
        user: { _id: 'invalid' },
        params: { id: new Types.ObjectId().toString() },
        body: {}
      } as any;
      const res = mockResponse();

      await paymentBillController.payBill(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ message: 'Invalid user' });
    });

    it('should return 404 if bill not found', async () => {
      const userId = new Types.ObjectId();
      const billId = new Types.ObjectId().toString();
      const req = {
        user: { _id: userId },
        params: { id: billId },
        body: {}
      } as any;
      const res = mockResponse();

      (PaymentBillModel.findOne as jest.Mock).mockResolvedValue(null);

      await paymentBillController.payBill(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({ message: 'Bill not found' });
    });

    it('should grant reward points after payment', async () => {
      const userId = new Types.ObjectId();
      const billId = new Types.ObjectId().toString();
      const req = {
        user: { _id: userId },
        params: { id: billId },
        body: {}
      } as any;
      const res = mockResponse();
      const mockBill = {
        _id: billId,
        billId: 'BILL001',
        userId,
        totalAmount: 1000,
        status: 'pending',
        save: jest.fn().mockResolvedValue(true)
      };
      const mockReward = {
        userId,
        points: 50,
        expiryDate: new Date(Date.now() + 1000000),
        save: jest.fn().mockResolvedValue(true)
      };

      (PaymentBillModel.findOne as jest.Mock).mockResolvedValue(mockBill);
      (Reward.findOne as jest.Mock).mockResolvedValue(mockReward);
      (createNotification as jest.Mock).mockResolvedValue({});

      await paymentBillController.payBill(req, res);

      expect(mockReward.points).toBe(60); // 50 + 10 (1% of 1000)
      expect(mockReward.save).toHaveBeenCalled();
    });

    it('should handle errors gracefully', async () => {
      const userId = new Types.ObjectId();
      const billId = new Types.ObjectId().toString();
      const req = {
        user: { _id: userId },
        params: { id: billId },
        body: {}
      } as any;
      const res = mockResponse();

      (PaymentBillModel.findOne as jest.Mock).mockRejectedValue(new Error('DB error'));

      await paymentBillController.payBill(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ message: expect.any(String) })
      );
    });

    it('should continue even if notification fails', async () => {
      const userId = new Types.ObjectId();
      const billId = new Types.ObjectId().toString();
      const req = {
        user: { _id: userId },
        params: { id: billId },
        body: {}
      } as any;
      const res = mockResponse();
      const mockBill = {
        _id: billId,
        billId: 'BILL001',
        userId,
        totalAmount: 100,
        status: 'pending',
        save: jest.fn().mockResolvedValue(true)
      };

      (PaymentBillModel.findOne as jest.Mock).mockResolvedValue(mockBill);
      (Reward.findOne as jest.Mock).mockResolvedValue(null);
      (Reward.create as jest.Mock).mockResolvedValue({});
      (createNotification as jest.Mock).mockRejectedValue(new Error('Notification failed'));

      await paymentBillController.payBill(req, res);

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Bill paid successfully'
        })
      );
    });

    it('should continue even if reward granting fails', async () => {
      const userId = new Types.ObjectId();
      const billId = new Types.ObjectId().toString();
      const req = {
        user: { _id: userId },
        params: { id: billId },
        body: {}
      } as any;
      const res = mockResponse();
      const mockBill = {
        _id: billId,
        billId: 'BILL001',
        userId,
        totalAmount: 100,
        status: 'pending',
        save: jest.fn().mockResolvedValue(true)
      };

      (PaymentBillModel.findOne as jest.Mock).mockResolvedValue(mockBill);
      (Reward.findOne as jest.Mock).mockResolvedValue(null);
      (Reward.create as jest.Mock).mockRejectedValue(new Error('Reward failed'));
      (createNotification as jest.Mock).mockResolvedValue({});

      await paymentBillController.payBill(req, res);

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Bill paid successfully'
        })
      );
    });
  });
});
