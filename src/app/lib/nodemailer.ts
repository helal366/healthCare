import nodemailer from "nodemailer"
import { envVars } from "../config"

export const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
        user: envVars.SMTP_USERNAME,
        pass: envVars.SMTP_PASSWORD
    }
})