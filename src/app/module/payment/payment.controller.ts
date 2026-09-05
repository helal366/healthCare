import type { Request, Response } from "express";
import { catchAsync } from "../../utils/catchAsync";
import { sendResponse } from "../../utils/sendResponse";
import { paymentServices } from "./payment.service";
import { StatusCodes } from 'http-status-codes';

const getPatientPayments = catchAsync(async (req: Request, res: Response) => {
    const user = req.user!;

    const { data, meta } = await paymentServices.getPatientPayments(req.query, user);
    sendResponse(res, {
        statusCode: StatusCodes.OK,
        success: true,
        message: "Payments Retrieved Successfully",
        data,
        meta,
    });
});

const getAllPayments = catchAsync(async (req: Request, res: Response) => {
    const { data, meta } = await paymentServices.getAllPayments(req.query);
    sendResponse(res, {
        statusCode: StatusCodes.OK,
        success: true,
        message: "Payments Retrieved Successfully",
        data,
        meta,
    });
});

const getSinglePayment = catchAsync(async (req: Request, res: Response) => {
    const paymentId = req.params.paymentId as string;
    const user = req.user!;

    const result = await paymentServices.getSinglePayment(paymentId, user);
    sendResponse(res, {
        statusCode: StatusCodes.OK,
        success: true,
        message: "Payment Retrieved Successfully",
        data: result,
    });
});

export const paymentController = {
    getPatientPayments,
    getAllPayments,
    getSinglePayment,
};