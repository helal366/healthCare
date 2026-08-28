import { NextFunction, Request, Response } from "express";
import { catchAsync } from "../../utils/catchAsync";
import { scheduleService } from "./schedule.service";
import { sendResponse } from "../../utils/sendResponse";
import { StatusCodes } from "http-status-codes";

const createSchedule=catchAsync(async(req:Request, res:Response, next:NextFunction)=>{
   const payload = req.body;
   const user = req.user!;

   const result = await scheduleService.createSchedule(payload, user);
   sendResponse(res, {
     statusCode: StatusCodes.CREATED,
     success: true,
     message: "Schedule Created Successfully",
     data: result,
   });
});

const getMySchedule=catchAsync(async(req:Request, res:Response, next:NextFunction)=>{
  const user = req.user!;
  const { data, meta } = await scheduleService.getMySchedule(req.query, user);
  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: "Schedule Created Successfully",
    data,
    meta
  });
});

const getAllSchedules=catchAsync(async(req:Request, res:Response, next:NextFunction)=>{
  const { data, meta } = await scheduleService.getAllSchedules(req.query);
  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: "Schedule Created Successfully",
    data,
    meta,
  });
});

const getScheduleById = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    const scheduleId = req.params.scheduleId as string;
    const result = await scheduleService.getScheduleById(scheduleId);
     sendResponse(res, {
       statusCode: StatusCodes.OK,
       success: true,
       message: "Schedule Created Successfully",
       data: result,
     });
  },
);

const updateSchedule = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    const scheduleId = req.params.scheduleId as string;
    const payload = req.body;
    const user = req.user!;

    const result = await scheduleService.updateSchedule(
      scheduleId,
      payload,
      user,
    );

    sendResponse(res, {
      statusCode: StatusCodes.OK,
      success: true,
      message: "Schedule Created Successfully",
      data: result,
    });
  },
);

const publishSchedule = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    const scheduleId = req.params.scheduleId as string;
    const user = req.user!;

    const result = await scheduleService.publishSchedule(scheduleId, user);

    sendResponse(res, {
      statusCode: StatusCodes.OK,
      success: true,
      message: "Schedule Created Successfully",
      data: result,
    });
  },
);

const deleteSchedule = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    const scheduleId = req.params.scheduleId as string;
    const user = req.user!;

    const result = await scheduleService.deleteSchedule(scheduleId, user);
    sendResponse(res, {
      statusCode: StatusCodes.OK,
      success: true,
      message: "Schedule Deleted Successfully",
      data: result,
    });
  },
);

const todaysSchedule = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    const { data, meta } = await scheduleService.todaysSchedule(req.query);
    sendResponse(res, {
      statusCode: StatusCodes.OK,
      success: true,
      message: "Schedule Created Successfully",
      data,
      meta,
    });
  },
);


export const scheduleController = {
  createSchedule,
  getMySchedule,
  getAllSchedules,
  getScheduleById,
  updateSchedule,
  publishSchedule,
  deleteSchedule,
  todaysSchedule,
};