import { StatusCodes } from "http-status-codes";
import { AppError } from "../../helperFunctions/globalErrorHelper";
import { prisma } from "../../lib/prisma";
import { IRequestUser } from "../auth/auth.interface";
import { ICreateSchedulePayload, IUpdateSchedulePayload } from "./schedule.interface";
import { addDays, differenceInMinutes, startOfDay } from "date-fns";
import { IQuery } from "../../interface";
import { ScheduleWhereInput } from "../../../generated/prisma/models";
import { SortOrder } from "./../../../generated/prisma/internal/prismaNamespace";
import { ScheduleStatus } from "../../../generated/prisma/enums";

// creating doctor schedule to examine the patients
const createSchedule = async (
  payload: ICreateSchedulePayload,
  user: IRequestUser,
) => {
  const doctor = await prisma.doctor.findUnique({
    where: { id: user.userId },
  });
  if (!doctor) {
    throw new AppError("Doctor profile not found.", StatusCodes.NOT_FOUND);
  }

  const startOfTheDay = startOfDay(payload.startDateTime);
  const startofNextDay = addDays(startOfTheDay, 1);

  const existingScheduleOnThisDate = await prisma.schedule.findFirst({
    where: {
      doctorId: doctor.id,
      isDeleted: false,
      startDateTime: {
        gte: startOfTheDay,
        lt: startofNextDay,
      },
    },
  });

  if (existingScheduleOnThisDate) {
    throw new AppError(
      "You have already a schedule on this day.",
      StatusCodes.BAD_REQUEST,
    );
  }

  const differenceInMinute = differenceInMinutes(
    payload.startDateTime,
    payload.endDateTime,
  );
  const MINUTES_ALLOCATED_PER_SLOT = 20;
  const totalSlots = Math.floor(
    differenceInMinute / MINUTES_ALLOCATED_PER_SLOT,
  );

  // schedule from doctor to visit patients
  const schedule = await prisma.schedule.create({
    data: {
      startDateTime: payload.startDateTime,
      endDateTime: payload.endDateTime,
      meetingLink: payload.meetingLink,
      totalSlots,
      availableSlots: totalSlots,
      doctorId: doctor.id,
    },
    include: {
      doctor: {
        select: {
          name: true,
          email: true,
          contactNo: true,
        },
      },
    },
  });
  return schedule;
};

const getMySchedule = async (query: IQuery, user: IRequestUser) => {
  const doctor = await prisma.doctor.findUnique({
    where: { userId: user.userId },
  });
  if (!doctor) {
    throw new AppError("Doctor profile not found.", StatusCodes.NOT_FOUND);
  }

  let limit = 10;
  if (query.limit) {
    limit = Number(query.limit);
  }

  let page = 1;
  if (query.page) {
    page = Number(query.page);
  }

  const skip = (page - 1) * limit;
  const sortBy = query.sortBy ?? "createdAt";
  const SortOrder = query.sortOrder ?? "desc";

  const andConditions: ScheduleWhereInput[] = [
    { doctorId: doctor.id },
    { isDeleted: false },
  ];
  if (query.status) {
    andConditions.push({ status: query.status });
  }

  const schedules = await prisma.schedule.findMany({
    where: {
      AND: andConditions,
    },
    take: limit,
    skip,
    orderBy: { [sortBy]: SortOrder },
    include: {
      appointments: {
        include: {
          patient: true,
        },
      },
    },
  });

  const total = await prisma.schedule.count({ where: { AND: andConditions } });
  return {
    data: schedules,
    meta: {
      page,
      limit,
      total,
      totalPages: Math.ceil(page / limit),
    },
  };
};

const getAllSchedules = async (query: IQuery) => {
  const limit = query.limit ? Number(query.limit) : 10;
  const page = query.page ? Number(query.page) : 1;
  const skip = (page - 1) * limit;
  const sortBy = query.sortBy ?? "createdAt";
  const SortOrder = query.sortOrder ?? "desc";

  const andConditions: ScheduleWhereInput[] = [];
  if (query.doctorId) {
    andConditions.push({ doctorId: query.doctorId });
  }
  if (query.email) {
    andConditions.push({
      doctor: {
        email: query.email,
      },
    });
  }
  if (query.status) {
    andConditions.push({
      status: query.status,
    });
  }
  if (query.searchTerm) {
    andConditions.push({
      doctor: {
        OR: [
          { name: { contains: query.searchTerm, mode: "insensitive" } },
          { email: { contains: query.searchTerm, mode: "insensitive" } },
          {
            specialization: { contains: query.searchTerm, mode: "insensitive" },
          },
        ],
      },
    });
  }

  const schedules = await prisma.schedule.findMany({
    where: {
      AND: andConditions,
    },
    take: limit,
    skip,
    orderBy: { [sortBy]: SortOrder },
    include: {
      appointments: {
        include: {
          patient: true,
        },
      },
    },
  });

  const total = await prisma.schedule.count({
    where: { AND: andConditions },
  });
  return {
    data: schedules,
    meta: {
      page,
      limit,
      total,
      totalPages: Math.ceil(page / limit),
    },
  };
};

const getScheduleById = async(scheduleId:string)=>{
    const schedule = await prisma.schedule.findUnique({
        where: {id: scheduleId},
        include:{
            doctor:{
                select:{
                    id:true,
                    name: true,
                    email: true,
                    specialization: true,
                    userId: true
                }
            },
            appointments:{
                include:{
                    patient: true
                }
            }
        }
    });

    if(!schedule || schedule.isDeleted){
        throw new AppError("Schedule not found.", StatusCodes.NOT_FOUND)
    };

    return schedule;
};

const updateSchedule=async(scheduleId:string, payload:IUpdateSchedulePayload, user:IRequestUser)=>{
    const doctor = await prisma.doctor.findUnique({
      where: { userId: user.userId },
    });
    if (!doctor) {
      throw new AppError("Doctor profile not found.", StatusCodes.NOT_FOUND);
    }

    const schedule = await prisma.schedule.findUnique({
        where:{id:scheduleId, doctorId:doctor.id}
    });
    if(!schedule){
        throw new AppError("Schedule not found.", StatusCodes.NOT_FOUND)
    };
    // if(schedule.doctorId !== doctor.id){
    //     throw new AppError("You are not allowed to update this schedule.", StatusCodes.UNAUTHORIZED)
    // };
    if (
      schedule.status === ScheduleStatus.PUBLISHED &&
      schedule.totalSlots !== schedule.availableSlots
    ) {
      throw new AppError(
        "Schedule once published and appointment booked, cannot update",
        StatusCodes.CONFLICT,
      );
    }

    payload.meetingLink = payload.meetingLink ?? schedule.meetingLink;
    payload.startDateTime = payload.startDateTime ?? schedule.startDateTime;
    payload.endDateTime = payload.endDateTime ?? schedule.endDateTime;

    const startOfTheDay = startOfDay(payload.startDateTime);
    const startofNextDay = addDays(startOfTheDay, 1);

    const existingScheduleOnThisDate = await prisma.schedule.findFirst({
      where: {
        doctorId: doctor.id,
        isDeleted: false,
        startDateTime: {
          gte: startOfTheDay,
          lt: startofNextDay,
        },
      },
    });

    if (existingScheduleOnThisDate) {
      throw new AppError(
        "You have already a schedule on this day.",
        StatusCodes.BAD_REQUEST,
      );
    };

    const differenceInMinute = differenceInMinutes(
      payload.startDateTime,
      payload.endDateTime,
    );
    const MINUTES_ALLOCATED_PER_SLOT = 20;
    const totalSlots = Math.floor(
      differenceInMinute / MINUTES_ALLOCATED_PER_SLOT,
    );

      const updatedSchedule = await prisma.schedule.update({
        where:{
            id: schedule.id
        },
        data: {
          startDateTime: payload.startDateTime,
          endDateTime: payload.endDateTime,
          meetingLink: payload.meetingLink,
          totalSlots,
          availableSlots: totalSlots,
          doctorId: doctor.id,
        },
        include: {
          doctor: {
            select: {
              name: true,
              email: true,
              contactNo: true,
            },
          },
        },
      });
      return updatedSchedule;
};

const publishSchedule = async(scheduleId:string, user:IRequestUser)=>{
  const doctor = await prisma.doctor.findUnique({
    where: { userId: user.userId },
  });
  if (!doctor) {
    throw new AppError("Doctor profile not found.", StatusCodes.NOT_FOUND);
  }

  const schedule = await prisma.schedule.findUnique({
    where: { id: scheduleId, doctorId: doctor.id },
  });
  if (!schedule) {
    throw new AppError("Schedule not found.", StatusCodes.NOT_FOUND);
  };

  if (schedule.status === ScheduleStatus.PUBLISHED) {
    throw new AppError(
      "Schedule once published and appointment booked, cannot update",
      StatusCodes.CONFLICT,
    );
  };

  const publishedSchedule = await prisma.schedule.update({
    where: {id:scheduleId},
    data:{ status: ScheduleStatus.PUBLISHED}
  });

  return publishedSchedule;
};

const deleteSchedule = async (scheduleId: string, user: IRequestUser) => {
  const doctor = await prisma.doctor.findUnique({
    where: { userId: user.userId },
  });
  if (!doctor) {
    throw new AppError("Doctor profile not found.", StatusCodes.NOT_FOUND);
  }

  const schedule = await prisma.schedule.findUnique({
    where: { id: scheduleId, doctorId: doctor.id },
  });
  if (!schedule) {
    throw new AppError("Schedule not found.", StatusCodes.NOT_FOUND);
  }

  if (
    schedule.status === ScheduleStatus.PUBLISHED &&
    schedule.totalSlots !== schedule.availableSlots
  ) {
    throw new AppError(
      "Schedule once published and appointment booked, cannot delete.",
      StatusCodes.CONFLICT,
    );
  };

  const deletedSchedule = await prisma.schedule.update({
    where:{
        id: scheduleId,
    },
    data:{
        isDeleted: true, 
        deletedAt: new Date()
    }
  })
};
export const scheduleService = {
  createSchedule,
  getMySchedule,
  getAllSchedules,
  getScheduleById,
  updateSchedule,
  publishSchedule,
  deleteSchedule,
};
