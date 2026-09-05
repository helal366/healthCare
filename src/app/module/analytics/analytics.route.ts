import { Router } from "express";
import { Role } from "../../../generated/prisma/enums";
import { auth } from "../../middleware/checkAuth";
import { analyticsController } from "./analytics.controller";

const router = Router();

router.get(
    "/patient-analytics",
    auth(Role.PATIENT),
    analyticsController.getPatientAnalytics,
);

router.get(
    "/doctor-analytics",
    auth(Role.DOCTOR),
    analyticsController.getDoctorAnalytics,
);

router.get(
    "/admin-analytics",
    auth(Role.ADMIN, Role.SUPER_ADMIN),
    analyticsController.getAdminAnalytics,
);

export const AnalyticsRouter = router;