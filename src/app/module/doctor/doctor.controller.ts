import { NextFunction, Request, Response } from "express";
import { catchAsync } from "../../utils/catchAsync";
import { doctorServices } from "./doctor.service";
import { sendResponse } from "../../utils/sendResponse";
import { StatusCodes } from "http-status-codes";
import { DoctorValidation } from "../../zodSchemas/applyDoctorZodSchema";
import { AppError } from "../../helperFunctions/globalErrorHelper";

const applyAsDoctor= catchAsync(async(req:Request, res:Response, next:NextFunction)=>{
    const files = req.files as {[field:string]:Express.Multer.File[]};

    const resume = files?.["resume"] ? files["resume"][0] : null;
    const additionalFiles = files?.["additionalFiles"] ?? [];
     let requestPayload;

     try {
       requestPayload = JSON.parse(req.body.data);
     } catch {
       throw new AppError(
         "Invalid JSON in request data",
         StatusCodes.BAD_REQUEST,
       );
     }
    const validationResult = DoctorValidation.applyDoctorZodSchema.safeParse(requestPayload);
    if(!validationResult.success){
      throw new AppError(validationResult.error?.issues[0].message ?? "Invalid request payload", StatusCodes.BAD_REQUEST)
    }
    const payload = validationResult.data
    const result = await doctorServices.applyAsDoctor(
      payload,
      resume,
      additionalFiles,
    );
    sendResponse(res, {
      success: true,
      statusCode: StatusCodes.OK,
      message: "Applied as doctor successfully.",
      data: result,
    });
});

export const doctorController = {
  applyAsDoctor,
};