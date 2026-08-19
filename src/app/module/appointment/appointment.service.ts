import { success } from "zod";
import { envVars } from "../../config";
import { getBkashIdToken } from "../../lib/bkash";
import { IBkashCallbackQueryPayload } from "./appointment.interface";
import { AppError } from "../../helperFunctions/globalErrorHelper";
import { StatusCodes } from "http-status-codes";

const bookAppointment = async () => {
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
        //agreementID: "TokenizedMerchant01L3IKB6H1565072174986", //appointment id
        mode: "0011",
        payerReference: "01723888888", // email or phone number
        callbackURL: `${envVars.BKASH_CALLBACK_URL}/appointment/book_appointment/payment/callback`,
        merchantAssociationInfo: "MI05MID54RF09123456One",
        amount: "100",
        currency: "BDT",
        intent: "sale",
        merchantInvoiceNumber: "Inv0124", //appointment id
      }),
    },
  );
  if (!bkashCreatePaymentResponse.ok) {
  }
  const bkashCreatePaymentResult = await bkashCreatePaymentResponse.json();

  return bkashCreatePaymentResult;
};

const bookAppointmentCallback=async(query:Record<string,any>)=>{
    const {paymentID, status, }=query.paymentID;
    if(!paymentID){
        throw new AppError("Payment ID missing.", StatusCodes.BAD_REQUEST)
    }
    if(!status){
        throw new AppError("Payment Status missing.", StatusCodes.BAD_REQUEST)
    };

    const bkashGrantIdToken= await getBkashIdToken();

    const executedPayment = await fetch(
      `${envVars.BKASH_BASE_URL}/tokenized/checkout/execute`,
    );
    return {success:true}
}
export const appointmentService = {
  bookAppointment,
  bookAppointmentCallback,
};
