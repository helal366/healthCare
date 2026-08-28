import { Router } from "express";
import { scheduleController } from "./schedule.controller";
import { validateZodSchema } from "../../middleware/validateZodSchema";
import { CreateSchemaValidationZodSchema, UpdateSchemaValidationZodSchema } from "./schedule.validation";
import { auth } from "../../middleware/checkAuth";
import { Role } from "../../../generated/prisma/enums";

const router = Router();
router.post(
  "/create_schedule",
  auth(Role.DOCTOR),
  validateZodSchema(CreateSchemaValidationZodSchema),
  scheduleController.createSchedule,
);
router.get("/my_schedule", auth(Role.DOCTOR), scheduleController.getMySchedule);
router.get("/all_schedule", auth(Role.ADMIN, Role.SUPER_ADMIN), scheduleController.getAllSchedules);
router.get("/todays_schedule", auth(Role.PATIENT), scheduleController.todaysSchedule);
router.patch("/update_schedule/:scheduleId", 
    auth(Role.DOCTOR), 
    validateZodSchema(UpdateSchemaValidationZodSchema),
    scheduleController.updateSchedule,
);
router.patch("/publish_schedule/:scheduleId",
    auth(Role.DOCTOR),
    validateZodSchema(UpdateSchemaValidationZodSchema),
    scheduleController.publishSchedule
);
router.get("/:scheduleId", 
    auth(Role.SUPER_ADMIN, Role.ADMIN, Role.DOCTOR),
    scheduleController.getScheduleById
);
router.delete("/:scheduleId", 
    auth(Role.DOCTOR),
    scheduleController.deleteSchedule
)
export const ScheduleRouter = router;