import type { NextFunction, Request, Response } from "express";
import { Prisma } from "../../generated/prisma/client";
import { envVars } from "../config";
import { StatusCodes } from "http-status-codes";
import { AppError } from "../helperFunctions/globalErrorHelper";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const globalErrorHandler = async (
	err: any,
	_req: Request,
	res: Response,
	_next: NextFunction,
) => {
	if (envVars.NODE_ENV === "development") {
		console.log("Error from Global Error Handler", err);
	}

	let statusCode: number = StatusCodes.INTERNAL_SERVER_ERROR;
	let message = err.message || "Internal Server Error";
	const errorName = err.name || "Internal Server Error";
	// let errorDetails = err.stack

	 if (err instanceof AppError) {
     statusCode = err.statusCode;
     message = err.message;
   }
	if (err instanceof Prisma.PrismaClientValidationError) {
		statusCode = StatusCodes.BAD_REQUEST;
		message = "You have provided incorrect field type or missing fields";
	} else if (err instanceof Prisma.PrismaClientKnownRequestError) {
		if (err.code === "P2002") {
			(statusCode = StatusCodes.BAD_REQUEST),
				(message = "Duplicate Key Error");
		} else if (err.code === "P2003") {
			(statusCode = StatusCodes.BAD_REQUEST),
				(message = "Foreign key constraint failed");
		} else if (err.code === "P2025") {
			(statusCode = StatusCodes.BAD_REQUEST),
				(message =
					"An operation failed because it depends on one or more records that were required but not found.");
		}
	} else if (err instanceof Prisma.PrismaClientInitializationError) {
		if (err.errorCode === "P1000") {
			statusCode = StatusCodes.UNAUTHORIZED;
			message =
				"Authentication failed against database server. Please Check Your Credentials";
		} else if (err.errorCode === "P1001") {
			statusCode = StatusCodes.BAD_REQUEST;
			message = "Can't reach database server";
		}
	} else if (err instanceof Prisma.PrismaClientUnknownRequestError) {
		statusCode = StatusCodes.INTERNAL_SERVER_ERROR;
		message = "Error occurred during query execution";
	} else if (err instanceof Error) {
		message = err.message;
	}

	res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
		success: false,
		statusCode: statusCode || StatusCodes.INTERNAL_SERVER_ERROR,
		name:
			envVars.NODE_ENV === "development" ? errorName : "Internal Server Error",
		message:
			envVars.NODE_ENV === "development"
				? message
				: "Internal Server Error",
		error: envVars.NODE_ENV === "development" ? err : undefined,
		stack: envVars.NODE_ENV === "development" ? err.stack : undefined,
	});
};
