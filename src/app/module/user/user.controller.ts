import { NextFunction, Request, Response } from "express";
import { catchAsync } from "../../utils/catchAsync";
import { sendResponse } from "../../utils/sendResponse";
import { StatusCodes } from "http-status-codes";
import { AppError } from "../../helperFunctions/globalErrorHelper";
import { userServices } from "./user.service";
import { envVars } from "../../config";

const uploadProfileImage=catchAsync(async(req:Request, res:Response, next:NextFunction)=>{
    if(!req.file || !req.user){
        throw new AppError("Error! file or user missing", StatusCodes.BAD_REQUEST)
    }
    const userId =req.user.userId;
    const result =await userServices.uploadProfileImage(req.file.buffer, userId);
    sendResponse(res, {
      success: true,
      statusCode: StatusCodes.OK,
      message: "Image uploaded successfully.",
      data: result,
    });
});
export const userController = {
  uploadProfileImage,
};