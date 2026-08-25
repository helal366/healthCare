import { StatusCodes } from "http-status-codes";
import { AppError } from "../../helperFunctions/globalErrorHelper";
import { prisma } from "../../lib/prisma";
import { UploadApiResponse } from "cloudinary";
import { cloudinary } from "../../lib/cloudinary";
import crypto from "crypto";
import path from "path";
import ejs from "ejs";
import bcrypt from "bcryptjs";
import { envVars } from "../../config";
import { DoctorVerificationStatus, Role } from "../../../generated/prisma/enums";
import { redisClient } from "../../lib/redis";
import { transporter } from "../../lib/nodemailer";
import { ApplyDoctorPayload } from "../../zodSchemas/applyDoctorZodSchema";
import { IApproveDoctorPayload, IVerifyDoctorEmailPayload } from "./doctor.interface";
import { IRequestUser } from "../auth/auth.interface";

const applyAsDoctor = async (
  payload: ApplyDoctorPayload,
  resume: Express.Multer.File | null,
  additionalFiles: Express.Multer.File[],
) => {
  const isUserExists = await prisma.user.findUnique({
    where: {
      email: payload.user.email,
    },
  });
  if (isUserExists) {
    throw new AppError(
      "User already exists with this email.",
      StatusCodes.BAD_REQUEST,
    );
  }

  const resumeUploadResult = await new Promise<UploadApiResponse>(
    (resolve, reject) => {
      cloudinary.uploader
        .upload_stream({ resource_type: "auto" }, (error, result) => {
          if (error) {
            console.log(error);
            return reject(error);
          }
          if (!result) {
            return reject(new Error("No result returned from cloudinary."));
          }
          return resolve(result);
        })
        .end(resume?.buffer);
    },
  );

  const additionalFilesUploadResults = await Promise.all(
    additionalFiles.map((file) => {
      return new Promise<UploadApiResponse>((resolve, reject) => {
        cloudinary.uploader
          .upload_stream({ resource_type: "auto" }, (error, result) => {
            if (error) {
              console.log(error);
              return reject(error);
            }
            if (!result) {
              return reject(new Error("No result returned from cloudinary."));
            }
            return resolve(result);
          })
          .end(file?.buffer);
      });
    }),
  );

  const string = "23456789abcdefghijkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ";
  function generateRandomString(strLen: number) {
    let randomString = "";
    for (let i = 0; i < strLen; i++) {
      randomString += string[Math.floor(Math.random() * string.length)];
    }
    return randomString;
  }
  const password = generateRandomString(8);
  const hashedPassword = await bcrypt.hash(
    password,
    Number(envVars.BCRYPT_SALT_ROUNDS),
  );

  const doctorApplication = await prisma.user.create({
    data: {
      ...payload.user,
      password: hashedPassword,
      needPasswordChange: true,
      role: Role.DOCTOR,
      doctor: {
        create: {
          name: payload.user.name,
          email: payload.user.email,
          ...payload.doctor,
          resume: resumeUploadResult.secure_url,
          resumePublicId: resumeUploadResult.public_id,
          additionalFiles: additionalFilesUploadResults.map((file) => {
            return {
              url: file.secure_url,
              publicId: file.public_id,
            };
          }),
        },
      },
    },
    include: {
      doctor: true,
    },
  });

  const expirationSeconds = 60 * 60;
  const otpKey = `doctor_application_otp:${payload.user.email}`;
  const otpValue = crypto.randomInt(100000, 1000000).toString();

  await redisClient.set(otpKey, otpValue, {
    expiration: {
      type: "EX",
      value: expirationSeconds,
    },
  });

  const templatePath = path.join(
    process.cwd(),
    "src/app/templates/registration_email_verify.ejs",
  );

  const templateData = {
    name: payload.user.name,
    OTP: otpValue,
    expirationMinutes: expirationSeconds / 60,
    year: new Date().getFullYear(),
  };

  const html = await ejs.renderFile(templatePath, templateData);

  try {
    await transporter.sendMail({
      from: `"${envVars.EMAIL_SENDER_NAME}" <${envVars.EMAIL_SENDER}>`,
      to: payload.user.email,
      subject: "Verify Your HealthCare Email Address",
      html,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to send email";
    throw new AppError(message, StatusCodes.BAD_REQUEST);
  }
  return doctorApplication;
};

const verifyDoctorEmail = async (payload: IVerifyDoctorEmailPayload) => {
  const otp = payload.otp;
  const email = payload.email.trim().toLowerCase();
  const existingDoctor = await prisma.user.findUnique({
    where: {email, role: Role.DOCTOR}
  });
  if(!existingDoctor){
    throw new AppError("Doctor application not found. Please apply again.", StatusCodes.BAD_REQUEST)
  };

  const otpKey = `doctor_application_otp:${email}`;
  const redisOtpValue = await redisClient.get(otpKey);

  if(!redisOtpValue){
    throw new AppError("OTP expired. Your application window is closed. Please apply again", StatusCodes.BAD_REQUEST)
  };

  if(redisOtpValue !== otp){
    throw new AppError("OTP does not match.", StatusCodes.BAD_REQUEST)
  };

  await redisClient.del(otpKey);

  const verifiedDoctor = await prisma.user.update({
    where: {id: existingDoctor.id},
    data: {emailVerified: true},
    omit: {password: true},
    include: {doctor: true}
  });
  return verifiedDoctor
};

const approveDoctor = async (payload: IApproveDoctorPayload, reviewer:IRequestUser) => {
  const { doctorId, verificationStatus, rejectionReason } = payload;
  const existingDoctor = await prisma.doctor.findUnique({
    where:{id:doctorId},
    include: {user:true}
  });
  if(!existingDoctor){
    throw new AppError("Doctor not found.", StatusCodes.NOT_FOUND)
  };
  if(existingDoctor.isDeleted){
    throw new AppError("Doctor is deleted.", StatusCodes.NOT_FOUND)
  };
  if(!existingDoctor.user.emailVerified){
    throw new AppError("Doctor has not verified his/her email yet.", StatusCodes.BAD_REQUEST)
  };

  if (
    verificationStatus === DoctorVerificationStatus.REJECTED &&
    !rejectionReason
  ) {
    throw new AppError(
      "Rejection reason is required for application rejection",
      StatusCodes.BAD_REQUEST,
    );
  }
  if(existingDoctor.verificationStatus !== DoctorVerificationStatus.PENDING){
    throw new AppError("Doctor application has already been reviewed.", StatusCodes.BAD_REQUEST)
  };
  const updatedDoctor = await prisma.doctor.update({
    where: { id: doctorId },
    data: {
      verificationStatus,
      rejectionReason:
        verificationStatus === DoctorVerificationStatus.REJECTED
          ? rejectionReason
          : null,
      reviewedBy: reviewer.userId,
      reviewedAt: new Date(),
    },
  });

  const isApproved =
    updatedDoctor.verificationStatus === DoctorVerificationStatus.APPROVED;
  const templateName = isApproved
    ? "approve_doctor.ejs"
    : "rejected_doctor.ejs";
  const templatePath = path.join(
    process.cwd(),
    `src/app/templates/${templateName}`,
  );
  const templateData = {
    name: updatedDoctor.name,
    rejectionReason: rejectionReason ?? "",
    year: new Date().getFullYear(),
  };

  try {
    const html =await ejs.renderFile(templatePath, templateData);
     const subject = isApproved
       ? "Credentials Verified – Welcome to the HealthCare Provider Network!"
       : "Update Regarding Your HealthCare Application";
    await transporter.sendMail({
      from: `"${envVars.EMAIL_SENDER_NAME}" <${envVars.EMAIL_SENDER}>`,
      to: existingDoctor.user.email,
      subject,
      html,
    });
  } catch (error) {
     console.error(
       `[Mailer Error] Verification notice failed for doctor ${doctorId}:`,
       error,
     );
    const message =
      error instanceof Error
        ? error.message
        : "Failed to send notification email";
    throw new AppError(message, StatusCodes.INTERNAL_SERVER_ERROR)
  }
};
export const doctorServices = {
  applyAsDoctor,
  verifyDoctorEmail,
  approveDoctor,
};
