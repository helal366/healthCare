import { NextFunction, Request, Response } from "express";
import { catchAsync } from "../../utils/catchAsync";
import { sendResponse } from "../../utils/sendResponse";
import { StatusCodes } from "http-status-codes";

const bookAppointment = catchAsync(async(req:Request, res:Response, next:NextFunction)=>{
    sendResponse(res, {
        success: true,
        statusCode: StatusCodes.CREATED,
        message: "Appointment created successfully.",
        data: null
    })
});

export const appointmentController = {
  bookAppointment,
};