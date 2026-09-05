import { Router } from "express";
import { Role } from "../../../generated/prisma/enums";
import { auth } from "../../middleware/checkAuth";
import { paymentController } from "./payment.controller";

const router = Router();

router.get("/patient_payments", auth(Role.PATIENT), paymentController.getPatientPayments);

router.get(
    "/all_payments",
    auth(Role.ADMIN, Role.SUPER_ADMIN),
    paymentController.getAllPayments,
);

router.get(
    "/:paymentId",
    auth(Role.PATIENT, Role.ADMIN, Role.SUPER_ADMIN),
    paymentController.getSinglePayment,
);

export const PaymentRouter = router;