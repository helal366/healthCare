import { envVars } from "../../config";
import { getBkashIdToken } from "../../lib/bkash";
import { AppError } from "../../helperFunctions/globalErrorHelper";
import { StatusCodes } from "http-status-codes";
import { prisma } from "../../lib/prisma";
import { AppointmentStatus, PaymentStatus } from './../../../generated/prisma/enums';
import { ICheckAuthPatient } from "./appointment.interface";

const bookAppointment = async (payload: any, user: ICheckAuthPatient) => {

  const transcationResult = await prisma.$transaction(async(tx)=>{
    // appointment
    const appointment = await tx.appointment.create({
      data:{
        status: AppointmentStatus.PENDING
      }
    })
    // bkash
    const bkashIdToken = await getBkashIdToken();
    const bkashCreatePaymentResponse = await fetch(
      `${envVars.BKASH_BASE_URL}/tokenized/checkout/create`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
          Authorization: bkashIdToken.id_token,
          "X-App-Key": envVars.BKASH_APP_KEY,
        },
        body: JSON.stringify({
          mode: "0011",
          payerReference: user.email, // email or phone number
          callbackURL: `${envVars.BKASH_CALLBACK_URL}/appointment/book_appointment/payment/callback`,
          amount: "100",
          currency: "BDT",
          intent: "sale",
          merchantInvoiceNumber: appointment.id, //appointment id and it is unique
        }),
      },
    );
    if (!bkashCreatePaymentResponse.ok) {
      throw new AppError("bkash create payment failed.", StatusCodes.BAD_REQUEST)
    }
  
    const bkashCreatePaymentResult = await bkashCreatePaymentResponse.json();
    
    // create payment
    const payment = await tx.payment.create({
      data: {
        amount: bkashCreatePaymentResult.amount,
        merchantInvoiceNumber: bkashCreatePaymentResult.merchantInvoiceNumber,
        appointmentId: appointment.id,
        gatewayResponse: bkashCreatePaymentResult,
        bkashPaymentId: bkashCreatePaymentResult.paymentID,
        payerReference: user.email
      },
    });
    return {bkashCreatePaymentResult, payment};  
  });
  return transcationResult
 
};

const bookAppointmentCallback=async(query:Record<string,any>)=>{
  console.log(query)
    const {paymentID, status }=query;
    if(!paymentID){
        throw new AppError("Payment ID missing.", StatusCodes.BAD_REQUEST)
    }
    if(!status){
        throw new AppError("Payment Status missing.", StatusCodes.BAD_REQUEST)
    };
    const bkashGrantIdToken= await getBkashIdToken();

    const transactionResult = await prisma.$transaction(async(tx)=>{
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
      
      if(!executedPaymentResponse.ok){
          throw new AppError("Payment execution failed.", StatusCodes.BAD_REQUEST)
      }
      const executedPayment = await executedPaymentResponse.json();
      if(status==="success"){
        await tx.appointment.update({
          where: {
            id: executedPayment.merchantInvoiceNumber
          },
          data:{
            status: AppointmentStatus.CONFIRMED,
          }
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
          redirectUrl: `${envVars.FRONTEND_URL}/dashboard/my_appointments?status=success`
        }
      }else if (status === "failure"){
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
      }else if(status==="cancel"){
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
      };

      return {
        executedPayment,
        redirectUrl: `${envVars.FRONTEND_URL}/dashboard/my_appointments`,
      };
    })

    return transactionResult;

}
export const appointmentService = {
  bookAppointment,
  bookAppointmentCallback,
};
