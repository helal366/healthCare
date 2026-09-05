import { NextFunction, Request, Response } from "express";
import { catchAsync } from "../../utils/catchAsync";
import { doctorServices } from "./doctor.service";
import { sendResponse } from "../../utils/sendResponse";
import { StatusCodes } from "http-status-codes";
import { DoctorValidation } from "../../zodSchemas/applyDoctorZodSchema";
import { AppError } from "../../helperFunctions/globalErrorHelper";
import { IApproveDoctorPayload } from "./doctor.interface";

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

const verifyDoctorEmail = catchAsync(async(req:Request, res:Response, next: NextFunction)=>{
  const payload = req.body;
  const result = await doctorServices.verifyDoctorEmail(payload);
  sendResponse(res, {
    success: true,
    statusCode: StatusCodes.OK,
    message: "Doctor email verified successfully.",
    data: result,
  });
});

const approveDoctor = catchAsync(async(req:Request, res:Response, next:NextFunction)=>{
  const payload: IApproveDoctorPayload = req.body;
  const reviewer = req.user;
  if(!reviewer){
    throw new AppError("Please login.", StatusCodes.UNAUTHORIZED)
  }
  const result = await doctorServices.approveDoctor(payload, reviewer);
  sendResponse(res,{
    success: true,
    statusCode: StatusCodes.OK,
    message: "",
    data: null
  })
});

const getAllDoctors = catchAsync(async(req:Request, res:Response, next:NextFunction)=>{
  const {data, meta} =await doctorServices.getAllDoctors(req.query);
  sendResponse(res, {
    success: true,
    statusCode: StatusCodes.OK,
    message: "Doctors data retrieved successfully.",
    data: data,
    meta: meta
  })
});

const updateDoctorProfile = catchAsync(
	async (req: Request, res: Response) => {
		const payload = req.body;
		const user = req.user!;

		const result = await doctorServices.updateDoctorProfile(payload, user);
		sendResponse(res, {
			statusCode: StatusCodes.OK,
			success: true,
			message: "Doctor Profile Updated Successfully",
			data: result,
		});
	},
);



const getAvailableDoctorByTodaysSchedule = catchAsync(
	async (req: Request, res: Response) => {
	

		const { data, meta } = await doctorServices.getAvailableDoctorByTodaysSchedule(
			req.query
		);
		sendResponse(res, {
			statusCode: StatusCodes.OK,
			success: true,
			message: "Today's Available Doctors Retrieved Successfully",
			data,
			meta,
		});
	},
);

const getAllDoctorsListPublic = catchAsync(async (req: Request, res: Response) => {


	const { data, meta } = await doctorServices.getAllDoctorsListPublic(
		req.query
	);
	sendResponse(res, {
		statusCode: StatusCodes.OK,
		success: true,
		message: "Doctors Retrieved Successfully",
		data,
		meta,
	});
});

const getSingleDoctorPublicProfile = catchAsync(
	async (req: Request, res: Response) => {

		const doctorId = req.params.doctorId as string
		
		const result = await doctorServices.getSingleDoctorPublicProfile(
			doctorId
		);
		sendResponse(res, {
			statusCode: StatusCodes.OK,
			success: true,
			message: "Doctor Profile Retrieved Successfully",
			data: result,
		});
	},
);

export const doctorController = {
  applyAsDoctor,
  verifyDoctorEmail,
  approveDoctor,
  getAllDoctors,
  updateDoctorProfile,
  getAvailableDoctorByTodaysSchedule,
  getAllDoctorsListPublic,
  getSingleDoctorPublicProfile
};