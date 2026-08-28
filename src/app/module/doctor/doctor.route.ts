import { Router } from "express";
import { doctorController } from "./doctor.controller";
import { upload } from "../../lib/multer";
import { auth } from "../../middleware/checkAuth";
import { Role } from "../../../generated/prisma/enums";

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
router.get("/all_doctors_admin", auth(Role.ADMIN, Role.SUPER_ADMIN),doctorController.getAllDoctors)
export const DoctorRouter = router;
