import { NextFunction, Request, Response } from "express";
import { catchAsync } from "../../utils/catchAsync";
import { sendResponse } from "../../utils/sendResponse";
import { StatusCodes } from "http-status-codes";
import { appointmentService } from "./appointment.service";
import { ICheckAuthPatient } from "./appointment.interface";
import { AppError } from "../../helperFunctions/globalErrorHelper";

const bookAppointment = catchAsync(async(req:Request, res:Response, next:NextFunction)=>{
  const payload = req.body;
  const user: ICheckAuthPatient | undefined = req.user;
  if(!user){
    throw new AppError("Please Login...", StatusCodes.UNAUTHORIZED)
  }
    const result = await appointmentService.bookAppointment(payload, user);
    sendResponse(res, {
      success: true,
      statusCode: StatusCodes.CREATED,
      message: "Appointment created successfully. Please confirm your payment.",
      data: result,
    });
});

const payAppointment = catchAsync(async(req:Request, res:Response, next:NextFunction)=>{
  const payload = req.body;
  const user: ICheckAuthPatient | undefined = req.user;
  if (!user) {
    throw new AppError("Please Login...", StatusCodes.UNAUTHORIZED);
  }
  const result = await appointmentService.payAppointment(payload, user);
  sendResponse(res, {
    success: true,
    statusCode: StatusCodes.CREATED,
    message: "Confirm your payment .",
    data: result,
  });
});
const cancelAppointment = catchAsync(async(req:Request, res:Response, next:NextFunction)=>{
  const payload = req.body;
  const user: ICheckAuthPatient | undefined = req.user;
  if (!user) {
    throw new AppError("Please Login...", StatusCodes.UNAUTHORIZED);
  }
  const result = await appointmentService.cancelAppointment(payload);
  sendResponse(res, {
    success: true,
    statusCode: StatusCodes.CREATED,
    message: "Appointment cancelled and refunded successfully.",
    data: result,
  });
});

const bookAppointmentCallback = catchAsync(async(req:Request, res:Response, next:NextFunction)=>{
    const payload= req.query
    const result = await appointmentService.bookAppointmentCallback(payload);
    const {executedPayment, redirectUrl}=result;
    console.log({executedPayment})
    res.redirect(redirectUrl);
});
export const appointmentController = {
  bookAppointment,
  bookAppointmentCallback,
  payAppointment,
  cancelAppointment,
};