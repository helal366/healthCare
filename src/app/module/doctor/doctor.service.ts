import { StatusCodes } from "http-status-codes";
import { AppError } from "../../helperFunctions/globalErrorHelper";
import { prisma } from "../../lib/prisma";
import { email } from "zod";
import { UploadApiResponse } from "cloudinary";
import { cloudinary } from "../../lib/cloudinary";
import { resolve } from "node:dns";
import bcrypt from "bcryptjs";
import { envVars } from "../../config";
import { Role } from "../../../generated/prisma/enums";

const applyAsDoctor = async (
  payload: any,
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
    include:{
        doctor: true
    }
  });

  return doctorApplication;
};

export const doctorServices = {
  applyAsDoctor,
};
