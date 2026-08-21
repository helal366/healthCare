import { NextFunction, Request, Response } from "express";
import { catchAsync } from "../../utils/catchAsync";
import { sendResponse } from "../../utils/sendResponse";
import { StatusCodes } from "http-status-codes";
import { appointmentService } from "./appointment.service";
import { ICheckAuthPatient } from "./appointment.interface";

const bookAppointment = catchAsync(async(req:Request, res:Response, next:NextFunction)=>{
  const payload = req.body;
  const user = req.user as ICheckAuthPatient
    const result = await appointmentService.bookAppointment(payload, user);
    sendResponse(res, {
      success: true,
      statusCode: StatusCodes.CREATED,
      message: "Appointment created successfully.",
      data: result,
    });
});

const bookAppointmentCallback = catchAsync(async(req:Request, res:Response, next:NextFunction)=>{
    const payload= req.query
    const result = await appointmentService.bookAppointmentCallback(payload);
    const {executedPayment, redirectUrl}=result;
    console.log(executedPayment)
    res.redirect(redirectUrl);
    sendResponse(res, {
      success: true,
      statusCode: StatusCodes.OK,
      message: "Callback called successfully.",
      data: result
    });
})
export const appointmentController = {
  bookAppointment,
  bookAppointmentCallback,
};