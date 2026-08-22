import { Prisma } from "../../../generated/prisma/client";
import { Role } from "../../../generated/prisma/enums";

export interface IBkashCallbackQueryPayload {
  paymentID: string;
  status: string;
  signature: string;
  apiVersion: string;
}

export interface ICheckAuthPatient {
  email: string;
  name: string;
  userId: string;
  role: Role;
}

export interface IBkashCreatePaymentResponse extends Prisma.JsonObject{
  paymentID: string;
  bkashURL: string;
  callbackURL: string;
  successCallbackURL: string;
  failureCallbackURL: string;
  cancelledCallbackURL: string;
  amount: string;
  intent: string;
  currency: string;
  paymentCreateTime: string;
  transactionStatus: string;
  merchantInvoiceNumber: string;
  statusCode: string;
  statusMessage: string;
}