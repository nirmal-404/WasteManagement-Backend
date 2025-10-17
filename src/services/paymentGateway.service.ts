import Stripe from 'stripe'
import dotenv from 'dotenv'
import PaymentModel from '../models/paymentGateway'

dotenv.config()

export interface PaymentItem {
  price: number
  quantity: number
}

export interface CreatePaymentIntentOptions {
  items: PaymentItem[]
  currency?: string
  metadata?: Record<string, any>
}

export class PaymentGatewayService {
  private stripe: Stripe

  constructor(stripeInstance?: Stripe) {
    this.stripe =
      stripeInstance ??
      new Stripe(process.env.STRIPE_SECRET_KEY as string, {
        apiVersion: '2025-09-30.clover',
      })
  }

  calculateAmount(items: PaymentItem[]): number {
    if (!Array.isArray(items) || items.length === 0) {
      throw new Error('No items provided')
    }

    return items.reduce((acc, item) => {
      const price = Number(item.price)
      const qty = Number(item.quantity || 1)
      if (isNaN(price) || price <= 0) throw new Error('Invalid price in item')
      return acc + price * qty
    }, 0)
  }

  async createPaymentIntent(options: CreatePaymentIntentOptions) {
    const { items, currency = 'usd', metadata = {} } = options
    const amount = this.calculateAmount(items)

    const paymentIntent = await this.stripe.paymentIntents.create({
      amount,
      currency,
      metadata,
      automatic_payment_methods: { enabled: true },
    })

    await PaymentModel.create({
      stripePaymentIntentId: paymentIntent.id,
      amount: paymentIntent.amount!,
      currency: paymentIntent.currency!,
      status: paymentIntent.status,
      metadata: paymentIntent.metadata,
    })

    return paymentIntent.client_secret
  }

  async getPaymentIntent(id: string) {
    if (!id) throw new Error('Payment intent ID is required')
    return this.stripe.paymentIntents.retrieve(id)
  }
}
