import { StatusCodes } from "http-status-codes";
import { AppError } from "../../helperFunctions/globalErrorHelper";
import { IQuery } from "../../interface";
import { prisma } from "../../lib/prisma";
import { IRequestUser } from "../auth/auth.interface";
import { PaymentWhereInput } from "../../../generated/prisma/models";
import { Role } from "../../../generated/prisma/enums";

const getPatientPayments = async (query: IQuery, user: IRequestUser) => {
  const limit = query.limit ? Number(query.limit) : 10;
  const page = query.page ? Number(query.page) : 1;
  const skip = (page - 1) * limit;
  const sortBy = query.sortBy ?? "createdAt";
  const sortOrder = query.sortOrder ?? "desc";
  const patient = await prisma.patient.findUnique({
    where: { userId: user.userId },
  });
  if (!patient)
    throw new AppError("Patient profile not found.", StatusCodes.NOT_FOUND);

  const andConditions: PaymentWhereInput[]=[
    {appointment: {patientId: patient.id}}
  ]
  const payments = await prisma.payment.findMany({
    where:{AND: andConditions},
    take: limit,
    skip,
    orderBy: {"createdAt" : "desc"},
    include:{
        appointment:{
            include: {
                doctor:{select:{id: true, name: true, specialization: true}},
                schedule: true
            }
        }
    }
  });

  const total = await prisma.payment.count({
    where: {AND: andConditions}
  });

  return {
    data: payments,
    meta: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  }
};
const getAllPayments = async (query: IQuery,) => {
    const limit = query.limit ? Number(query.limit) : 10;
  const page = query.page ? Number(query.page) : 1;
  const skip = (page - 1) * limit;
  const sortBy = query.sortBy ?? "createdAt";
  const sortOrder = query.sortOrder ?? "desc";

  const andConditions: PaymentWhereInput[]=[];
  if(query.patientEmail){
    andConditions.push({
        appointment:{
            patient:{
                email: query.patientEmail
            }
        }
    })
  }
  const payments = await prisma.payment.findMany({
    where:{AND: andConditions},
    take: limit,
    skip,
    orderBy: {"createdAt" : "desc"},
    include:{
        appointment:{
            include: {
                doctor:{select:{id: true, name: true, specialization: true}},
                schedule: true
            }
        }
    }
  });

  const total = await prisma.payment.count({
    where: {AND: andConditions}
  });

  return {
    data: payments,
    meta: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  }
};
const getSinglePayment = async (paymentId:string, user:IRequestUser) => {
    const payment = await prisma.payment.findUnique({
        where:{id:paymentId},
        include:{
            appointment:{
                include:{
                    patient:{select: {id:true, name: true, email: true, userId: true}},
                    doctor:true,
                    schedule:true
                }
            }
        }
    });
    if(!payment){
        throw new AppError("Payment not found", StatusCodes.NOT_FOUND);
    };

    if(user.role === Role.PATIENT){
        if(user.userId !== payment.appointment?.patient.userId){
          throw new AppError("You are not allowed to view this payment.", StatusCodes.UNAUTHORIZED)
        }
      };
    
    return payment;
};

export const paymentServices = {
  getPatientPayments,
  getAllPayments,
  getSinglePayment,
};
