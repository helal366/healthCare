import { Router } from "express";
import { userController } from "./user.controller";
import { upload } from "../../lib/multer";
import { auth } from "../../middleware/checkAuth";
import { Role } from "../../../generated/prisma/enums";

const router = Router();
router.patch("/profile_image",
    auth(Role.SUPER_ADMIN, Role.ADMIN, Role.DOCTOR, Role.PATIENT),
    upload.single("profile_image"),
    userController.uploadProfileImage)
export const UserRouter = router;