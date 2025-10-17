import express from "express";
import Stripe from "stripe";
import dotenv from "dotenv";
import PaymentModel from "../models/paymentGateway";

dotenv.config();

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY as string, {
  apiVersion: "2025-09-30.clover",
});

const router = express.Router();

// Use raw body for webhook verification
router.post("/", express.raw({ type: "application/json" }), async (req, res) => {
  const sig = req.headers["stripe-signature"] as string | undefined;
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!sig || !webhookSecret) {
    console.warn("Missing signature or webhook secret");
    return res.status(400).send("Webhook signature required");
  }

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(req.body, sig, webhookSecret);
  } catch (err: any) {
    console.error("⚠️ Webhook signature verification failed.", err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  // Handle the event types you care about
  switch (event.type) {
    case "payment_intent.succeeded": {
      const pi = event.data.object as Stripe.PaymentIntent;
      console.log("PaymentIntent was successful:", pi.id);
      // Update DB
      await PaymentModel.findOneAndUpdate(
        { stripePaymentIntentId: pi.id },
        { status: "succeeded", metadata: pi.metadata },
        { upsert: true, new: true }
      );
      break;
    }
    case "payment_intent.payment_failed": {
      const pi = event.data.object as Stripe.PaymentIntent;
      console.log("Payment failed:", pi.id);
      await PaymentModel.findOneAndUpdate(
        { stripePaymentIntentId: pi.id },
        { status: "failed", metadata: pi.metadata },
        { upsert: true, new: true }
      );
      break;
    }
    case "payment_intent.processing": {
      const pi = event.data.object as Stripe.PaymentIntent;
      await PaymentModel.findOneAndUpdate(
        { stripePaymentIntentId: pi.id },
        { status: "processing" },
        { upsert: true, new: true }
      );
      break;
    }
    // Add other events if needed
  default:
      console.log(`Unhandled event type ${event.type}`);
  }

  return res.json({ received: true });
});

export default router;
