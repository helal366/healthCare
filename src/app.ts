import cookieParser from "cookie-parser";
import cors from "cors";
import express, {
	type Application,
	type Request,
	type Response,
} from "express";
import { globalErrorHandler } from "./app/middleware/globalErrorHandler";
import { notFound } from "./app/middleware/notFound";
import { AuthRouter } from "./app/module/auth/auth.route";
import { envVars } from "./app/config";
import { StatusCodes } from "http-status-codes";

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
