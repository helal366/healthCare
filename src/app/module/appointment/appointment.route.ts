import { Router } from "express";
import { appointmentController } from "./appointment.controller";
import { auth } from "../../middleware/checkAuth";
import { Role } from "../../../generated/prisma/enums";
import { validateZodSchema } from "../../middleware/validateZodSchema";
import { BookAppointmentValidationZodSchema, UpdateAppointmentStatusValidationZodSchema } from "../../zodSchemas/appointmentZodSchema";

const router = Router();

router.post(
  "/book_appointment",
  auth(Role.PATIENT, Role.ADMIN),
  validateZodSchema(BookAppointmentValidationZodSchema),
  appointmentController.bookAppointment,
);
router.post(
  "/pay_appointment",
  auth(Role.PATIENT, Role.ADMIN),
  appointmentController.payAppointment,
);
router.post(
  "/cancel_appointment_refund",
  auth(Role.PATIENT, Role.ADMIN, Role.ADMIN, Role.SUPER_ADMIN),
  appointmentController.cancelAppointment,
);
router.get(
  "/book_appointment/payment/callback",
  appointmentController.bookAppointmentCallback,
);
router.patch(
  "/update_status/:appointmentId",
  auth(Role.DOCTOR),
  validateZodSchema(UpdateAppointmentStatusValidationZodSchema),
  appointmentController.updateAppointmentStatus,
);
router.get(
  "/patient_appointments",
  auth(Role.PATIENT),
  appointmentController.getPatientAppointments,
);

router.get(
  "/doctor_appointments",
  auth(Role.DOCTOR),
  appointmentController.getDoctorAppointments,
);

router.get(
  "/all_appointments",
  auth(Role.ADMIN, Role.SUPER_ADMIN),
  appointmentController.getAllAppointments,
);

router.get(
  "/:appointmentId",
  auth(Role.PATIENT, Role.DOCTOR, Role.ADMIN, Role.SUPER_ADMIN),
  appointmentController.getSingleAppointment,
);
export const AppointmentRouter = router;
