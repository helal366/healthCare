import { NextFunction, Request, Response } from "express";
import { catchAsync } from "../../utils/catchAsync";
import { sendResponse } from "../../utils/sendResponse";
import { StatusCodes } from "http-status-codes";
import { appointmentService } from "./appointment.service";

const bookAppointment = catchAsync(async(req:Request, res:Response, next:NextFunction)=>{
    const result = await appointmentService.bookAppointment();
    sendResponse(res, {
      success: true,
      statusCode: StatusCodes.CREATED,
      message: "Appointment created successfully.",
      data: result,
    });
});

const bookAppointmentCallback = catchAsync(async(req:Request, res:Response, next:NextFunction)=>{
    console.log("request query: ", req.query)
    const result = await appointmentService.bookAppointmentCallback(req.query);
    sendResponse(res, {
        success: true,
        statusCode: StatusCodes.OK,
        message: "Callback called successfully.",
        data: {
        result,
        requestQuery: req.query
    },
    })
})
export const appointmentController = {
  bookAppointment,
  bookAppointmentCallback,
};