import { Request, Response } from "express";
import Stripe from "stripe";
import dotenv from "dotenv";
import PaymentModel from "../models/paymentGateway";

dotenv.config();

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY as string, {
  apiVersion: "2025-09-30.clover",
});

export class PaymentController {
  // Create a PaymentIntent and return client_secret to frontend
  async createPaymentIntent(req: Request, res: Response): Promise<Response | void> {
    try {
      const { items, currency = "usd", metadata = {} } = req.body;

      // Calculate amount server-side to prevent manipulation. Example: sum item.price * qty
      // Make sure `items` contains price in cents and qty — do not trust client input for price in production.
      if (!Array.isArray(items) || items.length === 0) {
        return res.status(400).json({ error: "No items provided" });
      }

      const amount = items.reduce((acc: number, item: any) => {
        const price = Number(item.price); // price should be in cents
        const quantity = Number(item.quantity || 1);
        return acc + price * quantity;
      }, 0);

      // Create PaymentIntent
      const paymentIntent = await stripe.paymentIntents.create({
        amount,
        currency,
        metadata,
        // Optional: automatic payment methods lets Stripe choose the best payment method (cards etc.)
        automatic_payment_methods: { enabled: true },
      });

      // Persist a preliminary record (status will be updated by webhook)
      await PaymentModel.create({
        stripePaymentIntentId: paymentIntent.id,
        amount: paymentIntent.amount!,
        currency: paymentIntent.currency!,
        status: paymentIntent.status,
        metadata: paymentIntent.metadata,
      });

      res.json({ clientSecret: paymentIntent.client_secret });
    } catch (error: any) {
      console.error("createPaymentIntent error:", error);
      res.status(500).json({ error: error.message || "Internal error" });
    }
  }

  // Optional server endpoint to fetch payment status by intent id
  async getPaymentIntent(req: Request, res: Response): Promise<Response | void> {
    try {
      const { id } = req.params;
      if (!id) {
        return res.status(400).json({ error: "Payment intent ID is required" });
      }
      const paymentIntent = await stripe.paymentIntents.retrieve(id);
      res.json(paymentIntent);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }
}
