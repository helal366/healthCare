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