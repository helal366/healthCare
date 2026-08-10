// import type { NextFunction, Request, RequestHandler, Response } from "express";

// export const catchAsync = (fn: RequestHandler) => {
// 	return async (req: Request, res: Response, next: NextFunction) => {
// 		try {
// 			await fn(req, res, next);
// 		} catch (error) {
// 			// console.log(error);

// 			// res.status(httpStatus.INTERNAL_SERVER_ERROR).json({
// 			//     success: false,
// 			//     statusCode: httpStatus.INTERNAL_SERVER_ERROR,
// 			//     message: "Failed to register user",
// 			//     error: (error as Error).message
// 			// })

// 			next(error);
// 		}
// 	};
// };

import type { NextFunction, Request, Response } from "express";
import { envVars } from "../config/index.js";
import { AppError } from "../helperFunctions/globalErrorHelper.js";
type AsyncHandler = (
	req: Request,
	res: Response,
	next: NextFunction,
) => Promise<void>;

export const catchAsync = (fn: AsyncHandler) => {
	return (req: Request, res: Response, next: NextFunction) => {
		Promise.resolve(fn(req, res, next)).catch((error: Error | AppError) => {
			if (envVars.NODE_ENV === "development") {
				console.log("Catch Async error: ", error);
			}
			next(error);
		});
	};
};
