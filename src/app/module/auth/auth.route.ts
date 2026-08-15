import { Router } from "express";
import { Role } from "../../../generated/prisma/enums";
import { auth } from "../../middleware/checkAuth";
import { AuthController } from "./auth.controller";
import { validateZodSchema } from "../../middleware/validateZodSchema";
import { UserValidation } from "../../zodSchemas/authZodSchema";

const router = Router();

router.post(
  "/register",
  validateZodSchema(UserValidation.authRegistrationZodSchema),
  AuthController.registerPatient,
);
router.post("/login", AuthController.loginUser);
router.get(
	"/me",
	auth(Role.ADMIN, Role.DOCTOR, Role.PATIENT, Role.SUPER_ADMIN),
	AuthController.getMe,
);
router.post("/refresh-token", AuthController.refreshToken);
router.post("/google", AuthController.googleLogin);
router.post("/forget_password", AuthController.forgetPassword);
router.post("/reset_password", AuthController.resetPassword);
export const AuthRouter = router;
