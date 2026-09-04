import { envVars } from "../../config";
import { getBkashIdToken } from "../../lib/bkash";
import { AppError } from "../../helperFunctions/globalErrorHelper";
import { StatusCodes } from "http-status-codes";
import { prisma } from "../../lib/prisma";
import {
  AppointmentStatus,
  PaymentStatus,
} from "./../../../generated/prisma/enums";
import {
  IBookAppointmentPayload,
  ICancelAppointmentPayload,
  ICheckAuthPatient,
  IPayAppointmentPayload,
  IUpdateAppointmentPayload,
} from "./appointment.interface";
import { bkashCreatePayment } from "./appointment.helperFunction";
import { addMinutes, isAfter, isBefore, isSameDay, subHours } from "date-fns";
import { transporter } from "../../lib/nodemailer";
import PDFDocument from "pdfkit";
import { IRequestUser } from "../auth/auth.interface";

const bookAppointment = async (
  payload: IBookAppointmentPayload,
  user: ICheckAuthPatient,
) => {
  const { scheduleId } = payload;
  const schedule = await prisma.schedule.findUnique({
    where: { id: scheduleId },
    include: {
      doctor: true,
    },
  });
  if (!schedule || schedule.isDeleted) {
    throw new AppError("Schedule not found.", StatusCodes.BAD_REQUEST);
  }
  if (schedule.status !== "PUBLISHED") {
    throw new AppError("Schedule not published", StatusCodes.BAD_REQUEST);
  }
  if (!schedule.doctor) {
    throw new AppError(
      "Schedule doctor not assigned.",
      StatusCodes.BAD_REQUEST,
    );
  }
  if (!schedule.doctor.consultationFee) {
    throw new AppError("Consultancy fee not defined.", StatusCodes.BAD_REQUEST);
  }
  const amount = schedule.doctor.consultationFee.toString();

  const transcationResult = await prisma.$transaction(async (tx) => {
    // patient
    const patient = await tx.patient.findUnique({
      where: { userId: user.userId },
    });
    if (!patient) {
      throw new AppError("Patient profile not found.", StatusCodes.NOT_FOUND);
    }

    const now = new Date();
    if (!isSameDay(now, schedule.startDateTime)) {
      throw new AppError(
        "Schedule is not available today.",
        StatusCodes.BAD_REQUEST,
      );
    }
    if (isAfter(now, schedule.startDateTime)) {
      throw new AppError("Schedule not available.", StatusCodes.BAD_REQUEST);
    }
    const existingAppointment = await tx.appointment.findFirst({
      where: {
        patientId: patient.id,
        scheduleId,
        status: {
          not: AppointmentStatus.CANCELLED,
        },
      },
    });
    if (existingAppointment?.status === AppointmentStatus.PENDING) {
      throw new AppError(
        "You already have a pending appointment. Please pay for that appointment.",
        StatusCodes.CONFLICT,
      );
    }
    if (existingAppointment?.status === AppointmentStatus.CONFIRMED) {
      throw new AppError(
        "You already confirmed your schedule for today.",
        StatusCodes.BAD_REQUEST,
      );
    }
    if (existingAppointment?.status === AppointmentStatus.ONGOING) {
      throw new AppError("Your appointment is ongoing.", StatusCodes.CONFLICT);
    }

    if (existingAppointment?.status === AppointmentStatus.COMPLETED) {
      throw new AppError(
        "You have completed today's schedule. Please try for another day.",
        StatusCodes.BAD_REQUEST,
      );
    }

    if (schedule.availableSlots === 0) {
      throw new AppError(
        "This schedule is fully booked.",
        StatusCodes.CONFLICT,
      );
    }
    if (!schedule.doctor.consultationFee) {
      throw new AppError(
        "Doctor has not set consultation fee yet.",
        StatusCodes.CONFLICT,
      );
    }

    // appointment
    const appointment = await tx.appointment.create({
      data: {
        status: AppointmentStatus.PENDING,
        patientId: patient.id,
        doctorId: schedule.doctor.id,
        scheduleId: schedule.id,
      },
    });

    // bkash

    const payload = {
      appointmentId: appointment.id,
      userEmail: user.email,
      amount,
    };
    const bkashCreatePaymentResult = await bkashCreatePayment(payload);

    // create payment
    const payment = await tx.payment.create({
      data: {
        amount: bkashCreatePaymentResult.amount,
        merchantInvoiceNumber: bkashCreatePaymentResult.merchantInvoiceNumber,
        appointmentId: appointment.id,
        gatewayResponse: bkashCreatePaymentResult,
        bkashPaymentId: bkashCreatePaymentResult.paymentID,
        payerReference: user.email,
      },
    });
    return { bkashCreatePaymentResult, payment };
  });
  return transcationResult;
};

const payAppointment = async (payload: IPayAppointmentPayload, user: ICheckAuthPatient) => {
  const appointmentId = payload.appointmentId;
  const existingAppointment = await prisma.appointment.findUnique({
    where: {
      id: appointmentId,
    },
    include: {
      schedule: {
        include: {
          doctor: true,
        },
      },
    },
  });
  if (!existingAppointment) {
    throw new AppError("Appointment not found.", StatusCodes.BAD_REQUEST);
  }
  if (existingAppointment.status !== "PENDING") {
    throw new AppError(
      `Appointment is ${existingAppointment.status}. Not payable.`,
      StatusCodes.BAD_REQUEST,
    );
  }
  if (!existingAppointment.schedule.doctor) {
    throw new AppError(
      "Schedule doctor not assigned.",
      StatusCodes.BAD_REQUEST,
    );
  }
  if (!existingAppointment.schedule.doctor.consultationFee) {
    throw new AppError("Consultancy fee not defined.", StatusCodes.BAD_REQUEST);
  }
  const amount = existingAppointment.schedule.doctor.consultationFee.toString();

  // bkash
  const bkashCreatePaymentResult = await bkashCreatePayment({
    appointmentId: existingAppointment.id,
    userEmail: user.email,
    amount,
  });

  // update payment
  const payment = await prisma.payment.update({
    where: {
      appointmentId: appointmentId,
    },
    data: {
      merchantInvoiceNumber: bkashCreatePaymentResult.merchantInvoiceNumber,
      payerReference: user.email,
      gatewayResponse: bkashCreatePaymentResult, //as Prisma.InputJsonValue,
      bkashPaymentId: bkashCreatePaymentResult.paymentID,
    },
  });
  return { bkashCreatePaymentResult, payment };
};

const bookAppointmentCallback = async (query: Record<string, any>) => {
  console.log(query);
  const { paymentID, status } = query;
  if (!paymentID) {
    throw new AppError("Payment ID missing.", StatusCodes.BAD_REQUEST);
  }
  if (!status) {
    throw new AppError("Payment Status missing.", StatusCodes.BAD_REQUEST);
  }
  const bkashGrantIdToken = await getBkashIdToken();
  if (!bkashGrantIdToken) {
    throw new AppError("bkash token id not found.", StatusCodes.UNAUTHORIZED);
  }

  const transactionResult = await prisma.$transaction(async (tx) => {
    const executedPaymentResponse = await fetch(
      `${envVars.BKASH_BASE_URL}/tokenized/checkout/execute`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
          Authorization: bkashGrantIdToken.id_token,
          "X-App-Key": envVars.BKASH_APP_KEY,
        },
        body: JSON.stringify({
          paymentID: paymentID,
        }),
      },
    );

    if (!executedPaymentResponse.ok) {
      throw new AppError("Payment execution failed.", StatusCodes.BAD_REQUEST);
    }
    const executedPayment = await executedPaymentResponse.json();

    const appointment = await tx.appointment.findUnique({
      where: {
        id: executedPayment.merchantInvoiceNumber,
      },
      include: {
        schedule: true,
        patient: true,
        doctor: true,
      },
    });
    if (!appointment) {
      throw new AppError("Appointment not found.", StatusCodes.NOT_FOUND);
    }

    const newAvailableSlots = Number(appointment.schedule.availableSlots) - 1;
    const bookedSlots =
      Number(appointment.schedule.totalSlots) - newAvailableSlots;
    const serialNumber = bookedSlots + 1;
    const minuteToAdd = (serialNumber - 1) * 20;
    const joiningTime = addMinutes(
      appointment.schedule.startDateTime,
      minuteToAdd,
    );
    if (status === "success") {
      await tx.appointment.update({
        where: {
          id: executedPayment.merchantInvoiceNumber,
        },
        data: {
          status: AppointmentStatus.CONFIRMED,
          serialNumber,
          joiningTime,
        },
      });
      await tx.schedule.update({
        where: {
          id: appointment.schedule.id,
        },
        data: {
          availableSlots: newAvailableSlots,
        },
      });
      await tx.payment.update({
        where: {
          bkashPaymentId: paymentID,
        },
        data: {
          status: PaymentStatus.PAID,
          gatewayResponse: executedPayment,
          bkashTrxId: executedPayment.trxID,
          paidAt: executedPayment.paymentExecuteTime,
        },
      });

      const pdfDocument = new PDFDocument({
        margin: 50,
      });

      const pdfChunks: Buffer[] = [];
      pdfDocument.on("data", (chunk: Buffer) => {
        pdfChunks.push(chunk);
      });

      const pdfReadyPromise = new Promise<Buffer>((resolve) => {
        pdfDocument.on("end", () => {
          resolve(Buffer.concat(pdfChunks));
        });
      });
      pdfDocument.fontSize(20).text("Healthcare System", { align: "center" });
      pdfDocument.fontSize(14).text("Appointment Invoice", { align: "center" });
      pdfDocument.moveDown(2);

      pdfDocument.text(`Patient Name: ${appointment.patient.name}`);
      pdfDocument.text(`Patient Email: ${appointment.patient.email}`);
      pdfDocument.moveDown(2);

      pdfDocument.text(`Doctor name: ${appointment.doctor.name}`);
      pdfDocument.text(`Specialization: ${appointment.doctor.specialization}`);
      pdfDocument.moveDown(2);

      pdfDocument.text(
        `Appointment Date: ${appointment.schedule.startDateTime.toDateString()}`,
      );
      pdfDocument.text(`Joining Time: ${joiningTime.toString()}`);
      pdfDocument.text(`Serial Number: ${serialNumber}`);
      pdfDocument.text(`Meeting Link: ${appointment.schedule.meetingLink}`);
      pdfDocument.moveDown(2);

      pdfDocument.text(`Amount Paid: ${executedPayment.amount} BDT`);
      pdfDocument.text(`Payment method: bkash`);
      pdfDocument.text(`Transaction ID: ${executedPayment.trxID}`);
      pdfDocument.text(`Paid at: ${executedPayment.paymentExecuteTime}`);

      pdfDocument.end();

      const pdfFullDocument = await pdfReadyPromise;

      await transporter.sendMail({
        from: `"${envVars.EMAIL_SENDER_NAME}" <${envVars.EMAIL_SENDER}>`,
        to: appointment.patient.email,
        subject: "Your Appointment Invoice – HealthCare System",
        // html,
        text: "Thank you for booking an appointment. Please check your Payment Invoice attached.",
        attachments: [
          {
            filename: "invoice.pdf",
            content: pdfFullDocument,
          },
        ],
      });
      return {
        executedPayment,
        redirectUrl: `${envVars.FRONTEND_URL}/dashboard/my_appointments?status=success`,
      };
    } else if (status === "failure") {
      await tx.payment.update({
        where: {
          bkashPaymentId: paymentID,
        },
        data: {
          status: PaymentStatus.FAILED,
          gatewayResponse: executedPayment,
        },
      });
      return {
        executedPayment,
        redirectUrl: `${envVars.FRONTEND_URL}/dashboard/my_appointments?status=failure`,
      };
    } else if (status === "cancel") {
      await tx.payment.update({
        where: {
          bkashPaymentId: paymentID,
        },
        data: {
          status: PaymentStatus.CANCELLED,
          gatewayResponse: executedPayment,
        },
      });
      return {
        executedPayment,
        redirectUrl: `${envVars.FRONTEND_URL}/dashboard/my_appointments?status=cancel`,
      };
    }

    return {
      executedPayment,
      redirectUrl: `${envVars.FRONTEND_URL}/dashboard/my_appointments`,
    };
  });

  return transactionResult;
};

const cancelAppointment = async (payload: ICancelAppointmentPayload, user: IRequestUser) => {
  const appointmentId = payload.appointmentId;
  const existingAppointment = await prisma.appointment.findUnique({
    where: {
      id: appointmentId,
    },
    include: {
      payment: true,
      schedule: true,
    },
  });
  if (!existingAppointment) {
    throw new AppError("Appointment not found.", StatusCodes.BAD_REQUEST);
  }

  if (
    existingAppointment.status === "ONGOING" ||
    existingAppointment.status === "COMPLETED" ||
    existingAppointment.status === "CANCELLED"
  ) {
    throw new AppError(
      `Appointment ${existingAppointment.status}`,
      StatusCodes.BAD_REQUEST,
    );
  }

  if (!existingAppointment.payment) {
    throw new AppError(
      "Appointment or payment not found.",
      StatusCodes.BAD_REQUEST,
    );
  }

  const transactionResult = await prisma.$transaction(async (tx) => {
    // update appointment
    const updatedAppointment = await tx.appointment.update({
      where: {
        id: appointmentId,
      },
      data: {
        status: "CANCELLED",
      },
    });

    // update schedule
    await tx.schedule.update({
      where: {
        id: existingAppointment.schedule.id,
      },
      data: {
        availableSlots: { increment: 1 },
      },
    });

    //check refund condition; atleast one hour before doctor schedule start.
    const now = new Date();
    const appointmentStartTime = existingAppointment.schedule.startDateTime;
    const noRefundStartTime = subHours(appointmentStartTime, 1);

    // if now > noRefundStartTime then no refund
    // eligible for refund: now  < noRefundStartTime;

    // if refundEligibility is false;
    const refundEligibility = isBefore(now, noRefundStartTime);
    if (!refundEligibility) {
      throw new AppError(
        "Refund eligible time exceeded.",
        StatusCodes.CONFLICT,
      );
    }

    // if refundEligibility is true then bkash refund execute;
    if (refundEligibility) {
      const bkashGrantIdToken = await getBkashIdToken();
      if (!bkashGrantIdToken) {
        throw new AppError(
          "bkash token id not found.",
          StatusCodes.UNAUTHORIZED,
        );
      }
      const id_token = bkashGrantIdToken.id_token;

      // 1. Perform network call OUTSIDE the database transaction
      const bkashPaymentRefundResponse = await fetch(
        `${envVars.BKASH_BASE_URL}/tokenized/checkout/payment/refund`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
            Authorization: id_token.trim(),
            "X-App-Key": envVars.BKASH_APP_KEY,
          },
          body: JSON.stringify({
            paymentID: existingAppointment.payment?.bkashPaymentId,
            trxID: existingAppointment.payment?.bkashTrxId,
            amount: String(existingAppointment.payment?.amount),
            sku: "Appointment cancellation",
            reason: "Patient is busy at the appointment schedule time.",
          }),
        },
      );

      // 2. DEFENSE: Catch HTTP transport errors (401 Unauthorized, 404, 500 etc.)
      if (!bkashPaymentRefundResponse.ok) {
        const errorText = await bkashPaymentRefundResponse
          .text()
          .catch(() => "Unknown network error");
        throw new AppError(
          `bKash API Gateway error (${bkashPaymentRefundResponse.status}): ${errorText}`,
          StatusCodes.BAD_GATEWAY,
        );
      }
      const bkashPaymentRefundResult = await bkashPaymentRefundResponse.json();

      // 3. DEFENSE: Catch bKash business-logic failures (e.g., code 2022 for low balance)
      if (
        bkashPaymentRefundResult.statusCode &&
        bkashPaymentRefundResult.statusCode !== "0000"
      ) {
        throw new AppError(
          bkashPaymentRefundResult.statusMessage || "bKash refund failed",
          StatusCodes.BAD_REQUEST,
        );
      }
      // update payment
      const updatedPayment = await tx.payment.update({
        where: {
          appointmentId,
        },
        data: {
          status: PaymentStatus.REFUNDED,
          refundTrxId: bkashPaymentRefundResult.refundTrxID,
          refundAmount: bkashPaymentRefundResult.amount,
          refundReason: "Patient is busy at the appointment schedule time.",
          refundedAt: bkashPaymentRefundResult.completedTime,
          gatewayResponse: bkashPaymentRefundResult,
        },
      });
    }
    
    const newPaymentInfo = await prisma.payment.findUnique({
      where:{
        appointmentId,
      }
    })

    return {
      appointment: updatedAppointment,
      payment: newPaymentInfo,
    };
  });

  return transactionResult;
};

// doctor only : CONFIRM => ONGOING => COMPLETE
const updatedAppointmentStatus=async(appointmentId:string, payload:IUpdateAppointmentPayload, user:IRequestUser)=>{
  const doctor = await prisma.doctor.findUnique({
    where:{userId: user.userId}
  });
  if(!doctor){
    throw new AppError("Not authorized", StatusCodes.UNAUTHORIZED)
  };

  const appointment =await prisma.appointment.findUnique({
    where:{id:appointmentId, doctorId: doctor.id}
  });
  if(!appointment){
    throw new AppError("Appointment not found.", StatusCodes.NOT_FOUND)
  };
  if(appointment.status === AppointmentStatus.COMPLETED){
    throw new AppError("Appointment is already Completed.", StatusCodes.CONFLICT)
  };
  if(appointment.status === AppointmentStatus.CANCELLED){
    throw new AppError("Appointment is cancelled.", StatusCodes.BAD_REQUEST)
  };
  if(appointment.status === AppointmentStatus.PENDING){
    throw new AppError("Appointment is Pending. Patient should confirm the appointment.", StatusCodes.BAD_REQUEST)
  }

  if(appointment.status === "CONFIRMED"){
    if(payload.status !== "ONGOING"){
      throw new AppError("Confirmed appointment can only forward to ONGOING.", StatusCodes.BAD_REQUEST)
    };
    await prisma.appointment.update({
      where:{id:appointmentId}, data:{status: payload.status}
    })
  };

  if(appointment.status === "ONGOING"){
    if(payload.status !== "COMPLETED"){
      throw new AppError("Ongoing Patient on forward to Completed status", StatusCodes.BAD_REQUEST)
    };
    await prisma.appointment.update({
      where:{id:appointmentId}, data:{status: payload.status}
    })
  };

  const updatedAppointment  = await prisma.appointment.findUnique({where:{id:appointmentId}});
  return updatedAppointment
} 
export const appointmentService = {
  bookAppointment,
  bookAppointmentCallback,
  payAppointment,
  cancelAppointment,
  updatedAppointmentStatus
};
