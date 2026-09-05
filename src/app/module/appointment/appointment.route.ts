import { Router } from "express";
import { appointmentController } from "./appointment.controller";
import { auth } from "../../middleware/checkAuth";
import { Role } from "../../../generated/prisma/enums";

const router = Router();

router.post("/book_appointment", auth(Role.PATIENT, Role.ADMIN), appointmentController.bookAppointment);
router.post("/pay_appointment", auth(Role.PATIENT, Role.ADMIN), appointmentController.payAppointment);
router.post("/cancel_appointment_refund", auth(Role.PATIENT, Role.ADMIN, Role.ADMIN, Role.SUPER_ADMIN), appointmentController.cancelAppointment);
router.get("/book_appointment/payment/callback", appointmentController.bookAppointmentCallback);
router.patch(
	"/update_status/:appointmentId",
	auth(Role.DOCTOR),
	// validateRequest(UpdateAppointmentStatusValidationZodSchema),
	appointmentController.updateAppointmentStatus,
);

export const AppointmentRouter = router;