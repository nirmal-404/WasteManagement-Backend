import { Router } from "express";
import { PaymentController } from "../controllers/paymentGatewayController";

const router = Router();
const controller = new PaymentController();

router.post("/create-payment-intent", controller.createPaymentIntent.bind(controller));
router.get("/intent/:id", controller.getPaymentIntent.bind(controller));

export default router;
