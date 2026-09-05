import { Router } from "express";
import { doctorController } from "./doctor.controller";
import { upload } from "../../lib/multer";
import { auth } from "../../middleware/checkAuth";
import { Role } from "../../../generated/prisma/enums";
import { validateZodSchema } from "../../middleware/validateZodSchema";
import { UpdateDoctorProfileValidationZodSchema } from "../../zodSchemas/doctorZodSchema";

const router = Router();
router.post(
  "/apply_as_doctor",
  upload.fields([
    { name: "resume", maxCount: 1 },
    { name: "additionalFiles", maxCount: 10 },
  ]),
  doctorController.applyAsDoctor,
);

router.post("/apply_as_doctor/verify_email", doctorController.verifyDoctorEmail);
router.post("/approve_doctor",auth(Role.ADMIN, Role.SUPER_ADMIN), doctorController.approveDoctor);
router.get("/all_doctors_admin", auth(Role.ADMIN, Role.SUPER_ADMIN),doctorController.getAllDoctors);
router.patch(
	"/update-my-profile",
	auth(Role.DOCTOR),
	validateZodSchema(UpdateDoctorProfileValidationZodSchema),
	doctorController.updateDoctorProfile,
);

// Public doctor-discovery routes (no auth) — meant for patients browsing before login.
router.get(
	"/public/available-today",
	doctorController.getAvailableDoctorByTodaysSchedule,
);

router.get(
	"/public/all-doctors",
	doctorController.getAllDoctorsListPublic,
);

router.get(
	"/public/:doctorId",
	doctorController.getSingleDoctorPublicProfile,
);
export const DoctorRouter = router;
