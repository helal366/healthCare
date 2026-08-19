import { Router } from "express";
import { appointmentController } from "./appointment.controller";

const router = Router();

router.post("/book_appointment", appointmentController.bookAppointment);
router.get("/book_appointment/payment/callback", appointmentController.bookAppointmentCallback);

export const AppointmentRouter = router;