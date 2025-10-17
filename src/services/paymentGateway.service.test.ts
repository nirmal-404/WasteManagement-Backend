import { PaymentGatewayService } from '../services/paymentGateway.service'
import PaymentModel from '../models/paymentGateway'

jest.mock('../models/paymentGateway')

const mockStripe = {
  paymentIntents: {
    create: jest.fn(),
    retrieve: jest.fn(),
  },
}

const mockPaymentModel = PaymentModel as jest.Mocked<typeof PaymentModel>
const service = new PaymentGatewayService(mockStripe as any)

describe('PaymentGatewayService', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('calculateAmount', () => {
    it('should calculate correct total amount', () => {
      const amount = service.calculateAmount([
        { price: 1000, quantity: 2 },
        { price: 500, quantity: 1 },
      ])
      expect(amount).toBe(2500)
    })

    it('should throw error if no items provided', () => {
      expect(() => service.calculateAmount([])).toThrow('No items provided')
    })

    it('should throw error if invalid price', () => {
      expect(() => service.calculateAmount([{ price: 0, quantity: 1 }])).toThrow(
        'Invalid price'
      )
    })
  })

  describe('createPaymentIntent', () => {
    it('should create payment intent and save to db', async () => {
      mockStripe.paymentIntents.create.mockResolvedValue({
        id: 'pi_123',
        amount: 2500,
        currency: 'usd',
        status: 'requires_payment_method',
        metadata: {},
        client_secret: 'secret_123',
      })

      mockPaymentModel.create.mockResolvedValue({} as any)

      const secret = await service.createPaymentIntent({
        items: [{ price: 2500, quantity: 1 }],
      })

      expect(mockStripe.paymentIntents.create).toHaveBeenCalledWith(
        expect.objectContaining({ amount: 2500 })
      )
      expect(mockPaymentModel.create).toHaveBeenCalled()
      expect(secret).toBe('secret_123')
    })
  })

  describe('getPaymentIntent', () => {
    it('should throw error if id missing', async () => {
      await expect(service.getPaymentIntent('')).rejects.toThrow(
        'Payment intent ID is required'
      )
    })

    it('should retrieve payment intent by id', async () => {
      mockStripe.paymentIntents.retrieve.mockResolvedValue({
        id: 'pi_123',
        amount: 2500,
        currency: 'usd',
      })

      const result = await service.getPaymentIntent('pi_123')
      expect(result.id).toBe('pi_123')
      expect(mockStripe.paymentIntents.retrieve).toHaveBeenCalledWith('pi_123')
    })
  })
})
