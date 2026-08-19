import { envVars } from "../../config";
import { getBkashIdToken } from "../../lib/bkash";

const bookAppointment = async()=>{
    const bkashIdToken =await  getBkashIdToken();
    const bkashCreatePayment = fetch(
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
          agreementID: "TokenizedMerchant01L3IKB6H1565072174986", //appointment id
          mode: "0001",
          payerReference: "01723888888", // email or phone number
          callbackURL: envVars.CALL_BACK_URL,
          merchantAssociationInfo: "MI05MID54RF09123456One",
          amount: "12",
          currency: "BDT",
          intent: "sale",
          merchantInvoiceNumber: "Inv0124",
        }),
      },
    );
};
export const appointmentService = {
  bookAppointment,
};