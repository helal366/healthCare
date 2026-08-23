import { NextFunction, Request, Response } from "express";
import { catchAsync } from "../../utils/catchAsync";
import { doctorServices } from "./doctor.service";
import { sendResponse } from "../../utils/sendResponse";
import { StatusCodes } from "http-status-codes";

const applyAsDoctor= catchAsync(async(req:Request, res:Response, next:NextFunction)=>{
    const files = req.files as {[field:string]:Express.Multer.File[]};

    const resume = files?.["resume"] ? files["resume"][0] : null;
    const additionalFiles = files?.["additionalFiles"] ?? [];
    const payload = JSON.parse(req.body.data);

    // console.log({resume, additionalFiles, data})
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