import { Router } from "express";
import { Role } from "../../../generated/prisma/enums";
import { auth } from "../../middleware/checkAuth";
import { validateZodSchema } from "../../middleware/validateZodSchema";
import { CreatePrescriptionValidationZodSchema } from "../../zodSchemas/prescriptionZodSchema";
import { prescriptionController } from "./prescription.controller";

const router = Router();

router.post(
    "/create-prescription",
    auth(Role.DOCTOR),
    validateZodSchema(CreatePrescriptionValidationZodSchema),
    prescriptionController.createPrescription,
);

router.get(
    "/:appointmentId",
    auth(Role.PATIENT, Role.DOCTOR, Role.ADMIN, Role.SUPER_ADMIN),
    prescriptionController.getSinglePrescription,
);

export const PrescriptionRouter = router;