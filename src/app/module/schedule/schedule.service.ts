import { StatusCodes } from "http-status-codes";
import { AppError } from "../../helperFunctions/globalErrorHelper";
import { prisma } from "../../lib/prisma"
import { IRequestUser } from "../auth/auth.interface"
import { ICreateSchedulePayload } from "./schedule.interface"

const createSchedule = async(payload: ICreateSchedulePayload, user:IRequestUser)=>{
    const doctor = await prisma.doctor.findUnique({
        where:{id: user.userId}
    });
    if(!doctor){
        throw new AppError("Doctor profile not found.", StatusCodes.NOT_FOUND)
    }
}
export const scheduleService = {
    createSchedule
}