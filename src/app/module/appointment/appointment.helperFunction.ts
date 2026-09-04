import { StatusCodes } from "http-status-codes";
import { envVars } from "../../config";
import { AppError } from "../../helperFunctions/globalErrorHelper";
import { getBkashIdToken } from "../../lib/bkash";
import { IBkashCreatePaymentResponse } from "./appointment.interface";
interface IBkashCreatePaymentProps {
  appointmentId:string;
  userEmail:string,
  amount:string;
}
export const bkashCreatePayment = async ({
  appointmentId,
  userEmail,
  amount
}: IBkashCreatePaymentProps) => {
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
        payerReference: userEmail, // email or phone number
        callbackURL: `${envVars.BKASH_CALLBACK_URL}/appointment/book_appointment/payment/callback`,
        amount,
        currency: "BDT",
        intent: "sale",
        merchantInvoiceNumber: appointmentId, //appointment id and it is unique
      }),
    },
  );
  if (!bkashCreatePaymentResponse.ok) {
    throw new AppError("bkash create payment failed.", StatusCodes.BAD_REQUEST);
  }
  const result: IBkashCreatePaymentResponse =
    await bkashCreatePaymentResponse.json();

  return result;
};