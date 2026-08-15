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
import { redisClient } from "./app/lib/redis";
import crypto from "crypto";

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
app.get(
  "/redis/test",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const otp = crypto.randomInt(10000, 100000);
      // await redisClient.set(
      // 	"forget-password-otp:patient@gmail.com", "123456", {
      // 		expiration:{
      // 			type: "EX",
      // 			value: 5*60
      // 		}
      // 	}
      // )
      res.status(StatusCodes.OK).json({
        success: true,
        message: "Redis testing ok.",
        data: otp,
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
