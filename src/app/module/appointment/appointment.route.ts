import { Router } from "express";
import { appointmentController } from "./appointment.controller";
import { auth } from "../../middleware/checkAuth";
import { Role } from "../../../generated/prisma/enums";

const router = Router();

router.post("/book_appointment", auth(Role.PATIENT, Role.ADMIN), appointmentController.bookAppointment);
router.get("/book_appointment/payment/callback", appointmentController.bookAppointmentCallback);

export const AppointmentRouter = router;