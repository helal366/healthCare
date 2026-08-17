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
11. at forget_password route service layer, add the following code at bottom:
```
 await transporter.sendMail({
    from: envVars.EMAIL_SENDER,
    to: isUserExists.email,
    subject: "Forget Password",
    html: `<h1>YOUR OTP IS: ${otp}</h1>`,
  });
```
12. at reset_password route service layer, add the following code at bottom:
```
await transporter.sendMail({
    from: envVars.EMAIL_SENDER,
    to: isUserExists.email,
    subject: "Password changed",
    html: `<h1>Your password is changed.</h1>`,
  });
```
13. you can decorate the html as your own.

## EJS for html templetes:
1. install ejs:
```
pnpm add ejs && pnpm add -D @types/ejs
```
2. create a folder named as templates under the app folder.
3. create a file named as forget_password.ejs
4. into the forget_password.ejs file, type ! and enter. you will get the following code as html file:
```
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Document</title>
</head>
<body>
    
</body>
</html>
```
5. change this code with your own email template.
6. into biome.json, find files and add:
```
"includes": [
		"**",
		"!src/generated",
		"!src/app/templates"
	]
```
7. into biome.json, find linter and add the above code.
8. into forget_password route service layer, at the bottom just before transporter, add :
```
const templatePath = path.join(
    process.cwd(),
    "src/app/templates/forget_password.ejs",
  );
  const html=await ejs.renderFile(templatePath, {OTP:otp})
  await transporter.sendMail({
    from: envVars.EMAIL_SENDER,
    to: isUserExists.email,
    subject: "Forget Password",
    html
  });
```
9. check the templatePath carefully and correct if necessary.

## Email verification:
1. 