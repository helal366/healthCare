import { envVars } from "../../config";
import { getBkashIdToken } from "../../lib/bkash";
import { AppError } from "../../helperFunctions/globalErrorHelper";
import { StatusCodes } from "http-status-codes";
import { prisma } from "../../lib/prisma";
import {
  AppointmentStatus,
  PaymentStatus,
} from "./../../../generated/prisma/enums";
import { ICheckAuthPatient } from "./appointment.interface";
import { bkashCreatePayment } from "./appointment.helperFunction";

const bookAppointment = async (payload: any, user: ICheckAuthPatient) => {
  const transcationResult = await prisma.$transaction(async (tx) => {
    // appointment
    const appointment = await tx.appointment.create({
      data: {
        status: AppointmentStatus.PENDING,
      },
    });
    // bkash
    const payload = {
      appointmentId: appointment.id,
      userEmail: user.email,
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

const payAppointment = async (payload: any, user: ICheckAuthPatient) => {
  const appointmentId = payload.appointmentId;
  const existingAppointment = await prisma.appointment.findUnique({
    where: {
      id: appointmentId,
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

  // bkash
  const bkashCreatePaymentResult = await bkashCreatePayment({
    appointmentId: existingAppointment.id,
    userEmail: user.email,
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
    if (status === "success") {
      await tx.appointment.update({
        where: {
          id: executedPayment.merchantInvoiceNumber,
        },
        data: {
          status: AppointmentStatus.CONFIRMED,
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

const cancelAppointment = async (payload: any) => {
  const appointmentId = payload.appointmentId;
  const existingAppointment = await prisma.appointment.findUnique({
    where: {
      id: appointmentId,
    },
    include: {
      payment: true,
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
  };

  
    if (!existingAppointment.payment) {
      throw new AppError(
        "Appointment or payment not found.",
        StatusCodes.BAD_REQUEST,
      );
    }

  const bkashGrantIdToken = await getBkashIdToken();
  if (!bkashGrantIdToken) {
    throw new AppError("bkash token id not found.", StatusCodes.UNAUTHORIZED);
  };
  const id_token =bkashGrantIdToken.id_token

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

    return {
      appointment: updatedAppointment,
      payment: updatedPayment,
    };
  });

  return transactionResult;
};
export const appointmentService = {
  bookAppointment,
  bookAppointmentCallback,
  payAppointment,
  cancelAppointment,
};
