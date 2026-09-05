import cookieParser from "cookie-parser";
import cors from "cors";
import express, {
  NextFunction,
  type Application,
  type Request,
  type Response,
} from "express";
import { globalErrorHandler } from "./app/middleware/globalErrorHandler";
import { notFound } from "./app/middleware/notFound";
import { AuthRouter } from "./app/module/auth/auth.route";
import { envVars } from "./app/config";
import { StatusCodes } from "http-status-codes";
import { UserRouter } from "./app/module/user/user.route";
import { getBkashIdToken } from "./app/lib/bkash";
import { AppointmentRouter } from "./app/module/appointment/appointment.route";
import { DoctorRouter } from "./app/module/doctor/doctor.route";
import { ScheduleRouter } from "./app/module/schedule/schedule.route";
import { PaymentRouter } from "./app/module/payment/payment.route";
import { PrescriptionRouter } from './app/module/prescription/prescription.route';
import { AnalyticsRouter } from "./app/module/analytics/analytics.route";

const app: Application = express();

app.use(
  cors({
    origin: envVars.FRONTEND_URL,
    credentials: true,
  }),
);

// Enable URL-encoded form data parsing
app.use(express.urlencoded({ extended: true }));

// Middleware to parse JSON bodies
app.use(express.json());
app.use(cookieParser());

app.use("/api/v1/auth", AuthRouter);
app.use("/api/v1/user", UserRouter);
app.use("/api/v1/appointment", AppointmentRouter);
app.use("/api/v1/doctor", DoctorRouter);
app.use("/api/v1/schedule", ScheduleRouter);
app.use("/api/v1/payment", PaymentRouter);
app.use("/api/v1/prescription", PrescriptionRouter);
app.use("/api/v1/analytics", AnalyticsRouter);

app.get(
  "/redis/test",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const bkashTokens = await getBkashIdToken();
      res.status(StatusCodes.OK).json({
        success: true,
        message: "Redis testing ok.",
        data: { bkashTokens },
      });
    } catch (error) {
      next(error);
    }
  },
);

// Basic route

app.get("/", async (req: Request, res: Response) => {
  res.status(StatusCodes.OK).json({
    success: true,
    message: "Welcome to PH Healthcare System Backend",
  });
});

app.use(globalErrorHandler);
app.use(notFound);

export default app;
