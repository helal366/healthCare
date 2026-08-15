## Google Cloud Platform
1. go to console
2. go to api and services
3. if no project, create a project.
4. go to credentials
5. go to create credentials
6. application type: web application. write your project name. 
7. authorized javascript origin: add frontend and backend urls. if not deployed, then localhosts as frontend and backend urls.
8. primarily do not need to add redirect url.
9. click on create.
10. store client ID and client secret at your env
11. update congig/index.ts file 

## Redis OTP procedure:
1. backend forget_password route, controller and service layer. from here set otp.
2. backend reset_password route, controller and service layer. from here get otp. match otp with redis and provided by user. if mismatch, throw error. if match change password and delete otp from redis.
3. check the two steps by postman.
4. from gmail account create GOOGLE APP PASSWORD for SMTP:SIMPLE MAIL TRANSFER PROTOCOL. copy the password and set at env as SMTP_PASSWORD.
5. set SMTP_USERNAME as the google email address from which GOOGLE APP PASSWORD created. set it at env.
6. set EMAIL_SENDER as the as the same google email address at env.
7. install nodemailer: 
```
pnpm add nodemailer && pnpm add -D @types/nodemailer
```
8. into lib folder, create a nodemailer.ts file.
9. go to nodemailer documentation --> guide --> using gmail. and see the code 
```
const nodemailer = require("nodemailer");

const transporter = nodemailer.createTransport({
  service: "gmail", // Shortcut for Gmail's SMTP settings - see Well-Known Services
  auth: {
    type: "OAuth2",
    user: "me@gmail.com",
    clientId: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    refreshToken: process.env.GOOGLE_REFRESH_TOKEN,
  },
});
```
10. according to the code, create your own code like:
```
import nodemailer from "nodemailer"
import { envVars } from "../config"

export const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
        user: envVars.SMTP_USERNAME,
        pass: envVars.SMTP_PASSWORD
    }
})
```