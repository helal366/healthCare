import { Router } from "express";
import { appointmentController } from "./appointment.controller";

const router = Router();

router.post("/book_appointment", appointmentController.bookAppointment);

export const AppointmentRouter = router;