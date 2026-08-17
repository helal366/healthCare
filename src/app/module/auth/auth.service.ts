import bcrypt from "bcryptjs";
import type { JwtPayload, SignOptions } from "jsonwebtoken";
import {
  AuthProvider,
  Role,
  UserStatus,
} from "../../../generated/prisma/enums";
import { prisma } from "../../lib/prisma";
import { jwtUtils } from "../../utils/jwt";
import type {
  IForgetPasswordPayload,
  IGoogleLoginPayload,
  ILoginUserPayload,
  IRegisterPatientPayload,
  IRequestUser,
  IResetPasswordPayload,
  IVerifyEmailPayload,
} from "./auth.interface";
import { envVars } from "../../config";
import { TokenPayload } from "google-auth-library";
import { googleClient } from "../../lib/googleAuth";
import { AppError } from "../../helperFunctions/globalErrorHelper";
import { StatusCodes } from "http-status-codes";
import crypto from "crypto";
import { redisClient } from "../../lib/redis";
import { transporter } from "../../lib/nodemailer";
import path from "path";
import ejs from "ejs";
import { welcomeForFirstRegistration } from "../../helperFunctions/authHelpers/welcomefunction";

const registerPatient = async (payload: IRegisterPatientPayload) => {
  const { name, password, patient: patientData } = payload;
  const email = payload.email.trim().toLowerCase();
  console.log({ email });

  const isUserExists = await prisma.user.findUnique({
    where: { email },
  });

  if (isUserExists) {
    throw new Error("User with this email already exists");
  }

  const hashedPassword = await bcrypt.hash(password, 8);

  const regOtp = crypto.randomInt(10000, 100000);
  const regKey = `patient_registration_key:${email}`;
  const expirationSeconds = 5 * 60;
  await redisClient.set(regKey, regOtp, {
    expiration: {
      type: "EX",
      value: expirationSeconds,
    },
  });

  const regPayloadKey = `patient_reg_payload_key:${email}`;
  // const regExpirationSeconds=15*60;
  const redisUserDataPayload: IRegisterPatientPayload = {
    name,
    email,
    password: hashedPassword,
    patient: patientData,
  };
  await redisClient.set(regPayloadKey, JSON.stringify(redisUserDataPayload), {
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
    name: name,
    OTP: regOtp,
    expirationMinutes: expirationSeconds / 60,
    year: new Date().getFullYear(),
  };
  const html = await ejs.renderFile(templatePath, templateData);
  try {
    await transporter.sendMail({
      from: `"${envVars.EMAIL_SENDER_NAME}" <${envVars.EMAIL_SENDER}>`,
      to: email,
      subject: "Verify Your HealthCare Email Address",
      html,
    });
  } catch (error) {
    console.error("Failed to send email:", error);
  }
};

const verifyPatientEmail = async (payload: IVerifyEmailPayload) => {
  const otp = payload.otp;
  const email = payload.email.trim().toLowerCase();
  const isUserExists = await prisma.user.findUnique({
    where: { email },
  });
  if (isUserExists) {
    if (isUserExists?.emailVerified) {
      throw new Error("Email already verified.");
    }
    if (isUserExists?.status === UserStatus.BLOCKED) {
      throw new AppError("Patient is blocked.", StatusCodes.UNAUTHORIZED);
    }
    if (isUserExists?.status === UserStatus.DELETED) {
      throw new AppError("Patient is deleted.", StatusCodes.UNAUTHORIZED);
    }
  }
  const regKey = `patient_registration_key:${email}`;
  const redisOtp = await redisClient.get(regKey);
  if (!redisOtp) {
    throw new AppError("Invalid OTP.", StatusCodes.BAD_REQUEST);
  }
  if (redisOtp !== otp) {
    throw new AppError("OTP mismatch", StatusCodes.BAD_REQUEST);
  }

  const regPayloadKey = `patient_reg_payload_key:${email}`;
  const redisPatientStringifyData = await redisClient.get(regPayloadKey);
  if (!redisPatientStringifyData) {
    throw new AppError(
      "Registration session has expired. Please register again.",
      StatusCodes.UNAUTHORIZED,
    );
  }
  const redisPatientData: IRegisterPatientPayload = JSON.parse(
    redisPatientStringifyData,
  );

  const createdUser = await prisma.user.create({
    data: {
      name: redisPatientData.name,
      email: redisPatientData.email,
      password: redisPatientData.password,
      role: Role.PATIENT,
      status: UserStatus.ACTIVE,
      emailVerified: true,
      patient: {
        create: {
          name: redisPatientData.name,
          email,
          contactNumber: redisPatientData.patient?.contactNumber || "",
        },
      },
    },
    omit: { password: true },
    include: { patient: true },
  });

  const { patient, ...user } = createdUser;
  const jwtPayload = {
    userId: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
  };

  const accessToken = jwtUtils.createToken(
    jwtPayload,
    envVars.JWT_ACCESS_SECRET,
    envVars.JWT_ACCESS_EXPIRES_IN as SignOptions,
  );

  const refreshToken = jwtUtils.createToken(
    jwtPayload,
    envVars.JWT_REFRESH_SECRET,
    envVars.JWT_REFRESH_EXPIRES_IN as SignOptions,
  );

  await redisClient.del(regKey);
  await redisClient.del(regPayloadKey);
  await welcomeForFirstRegistration({
    name: user.name,
    email: user.email,
    provider: "CREDENTIAL",
  });
  
  return {
    user,
    patient,
    accessToken,
    refreshToken,
  };
};

const loginUser = async (payload: ILoginUserPayload) => {
  const { password } = payload;
  const email = payload.email.trim().toLowerCase();

  const user = await prisma.user.findUnique({
    where: { email },
  });

  if (!user) {
    throw new Error("User not found");
  }

  if (user.status === UserStatus.BLOCKED) {
    throw new AppError("Patient is blocked", StatusCodes.UNAUTHORIZED);
  }

  if (user.isDeleted || user.status === UserStatus.DELETED) {
    throw new AppError("User is deleted", StatusCodes.UNAUTHORIZED);
  }

  if (!user.password && user.googleId) {
    throw new AppError(
      `Credentials found with Google email: ${user.email}`,
      StatusCodes.BAD_REQUEST,
    );
  }

  if (!user.password) {
    throw new AppError("Password not provided.", StatusCodes.UNAUTHORIZED);
  }

  const isPasswordMatched = await bcrypt.compare(password, user.password);

  if (!isPasswordMatched) {
    throw new Error("Invalid credentials");
  }

  const jwtPayload = {
    userId: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
  };

  const accessToken = jwtUtils.createToken(
    jwtPayload,
    envVars.JWT_ACCESS_SECRET,
    envVars.JWT_ACCESS_EXPIRES_IN as SignOptions,
  );

  const refreshToken = jwtUtils.createToken(
    jwtPayload,
    envVars.JWT_REFRESH_SECRET,
    envVars.JWT_REFRESH_EXPIRES_IN as SignOptions,
  );

  return {
    accessToken,
    refreshToken,
  };
};

const getMe = async (user: IRequestUser) => {
  const isUserExists = await prisma.user.findUnique({
    where: {
      id: user.userId,
    },
    include: {
      patient: true,
    },
    omit: {
      password: true,
    },
  });

  if (!isUserExists) {
    throw new Error("User not found");
  }

  return isUserExists;
};

const refreshToken = async (token: string) => {
  const verifiedRefreshToken = jwtUtils.verifyToken(
    token,
    envVars.JWT_REFRESH_SECRET,
  );

  if (!verifiedRefreshToken.success || !verifiedRefreshToken.data) {
    throw new Error(
      envVars.NODE_ENV === "development"
        ? verifiedRefreshToken.error
        : "Invalid refresh token",
    );
  }

  const data = verifiedRefreshToken.data as JwtPayload;

  const user = await prisma.user.findUnique({
    where: { id: data.userId },
  });

  if (!user || user.isDeleted || user.status !== UserStatus.ACTIVE) {
    throw new Error("User is inactive or not found");
  }

  const jwtPayload = {
    userId: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
  };

  const accessToken = jwtUtils.createToken(
    jwtPayload,
    envVars.JWT_ACCESS_SECRET,
    envVars.JWT_ACCESS_EXPIRES_IN as SignOptions,
  );

  const refreshToken = jwtUtils.createToken(
    jwtPayload,
    envVars.JWT_REFRESH_SECRET,
    envVars.JWT_REFRESH_EXPIRES_IN as SignOptions,
  );

  return {
    accessToken,
    refreshToken,
  };
};

const googleLogin = async (payload: IGoogleLoginPayload) => {
  let googleIdTokenPayload: TokenPayload | undefined | null = null;
  try {
    const ticket = await googleClient.verifyIdToken({
      idToken: payload.idToken,
      audience: envVars.GOOGLE_CLIENT_ID,
    });
    googleIdTokenPayload = ticket.getPayload();
  } catch (error) {
    console.log("Google ID token verification failed.", error);
    throw new AppError(
      "Invalid or Expired Google ID token.",
      StatusCodes.BAD_REQUEST,
    );
  }

  if (!googleIdTokenPayload) {
    throw new AppError(
      "Invalid or Expired Google ID token.",
      StatusCodes.BAD_REQUEST,
    );
  }

  if (!googleIdTokenPayload.email) {
    throw new AppError("Google email not found.", StatusCodes.UNAUTHORIZED);
  }
  if (!googleIdTokenPayload.name) {
    throw new AppError(
      "Google! User name not found.",
      StatusCodes.UNAUTHORIZED,
    );
  }
  if (!googleIdTokenPayload.sub) {
    throw new AppError("Google id not found", StatusCodes.BAD_REQUEST);
  }
  const isPatientExistsWithGoogleAuth = await prisma.user.findUnique({
    where: {
      email: googleIdTokenPayload.email,
      role: Role.PATIENT,
      googleId: googleIdTokenPayload.sub,
    },
  });

  let user = isPatientExistsWithGoogleAuth;

  if (!user) {
    const isPatientExistsWithCredentials = await prisma.user.findUnique({
      where: {
        email: googleIdTokenPayload.email,
        role: Role.PATIENT,
        authProvider: AuthProvider.CREDENTIAL,
      },
    });
    if (isPatientExistsWithCredentials) {
      if (isPatientExistsWithCredentials.status === UserStatus.BLOCKED) {
        throw new AppError("User is blocked", StatusCodes.UNAUTHORIZED);
      }
      if (isPatientExistsWithCredentials.status === UserStatus.DELETED) {
        throw new AppError("User is deleted", StatusCodes.UNAUTHORIZED);
      }
      user = await prisma.user.update({
        where: {
          email: googleIdTokenPayload.email,
          role: Role.PATIENT,
        },
        data: {
          googleId: googleIdTokenPayload.sub,
        },
      });
      await welcomeForFirstRegistration({name:user.name, email:user.email, provider: "GOOGLE"})
    } else {
      user = await prisma.user.create({
        data: {
          name: googleIdTokenPayload.name,
          email: googleIdTokenPayload.email,
          role: Role.PATIENT,
          googleId: googleIdTokenPayload.sub,
          authProvider: AuthProvider.GOOGLE,
          emailVerified: true,
          patient: {
            create: {
              name: googleIdTokenPayload.name,
              email: googleIdTokenPayload.email,
            },
          },
        },
      });
      if (!user) {
        throw new AppError("User not found", StatusCodes.NOT_FOUND);
      };
      await welcomeForFirstRegistration({name: user.name, email: user.email, provider:"GOOGLE"});
    }
  }

  const jwtPayload = {
    userId: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
  };

  const accessToken = jwtUtils.createToken(
    jwtPayload,
    envVars.JWT_ACCESS_SECRET,
    envVars.JWT_ACCESS_EXPIRES_IN as SignOptions,
  );

  const refreshToken = jwtUtils.createToken(
    jwtPayload,
    envVars.JWT_REFRESH_SECRET,
    envVars.JWT_REFRESH_EXPIRES_IN as SignOptions,
  );

  return {
    accessToken,
    refreshToken,
  };
};

const forgetPassword = async (payload: IForgetPasswordPayload) => {
  const { email } = payload;
  const isUserExists = await prisma.user.findUnique({
    where: {
      email,
    },
  });
  if (!isUserExists) {
    throw new AppError("Credential not found.", StatusCodes.BAD_REQUEST);
  }
  if (isUserExists.status === "BLOCKED") {
    throw new AppError("Credential blocked.", StatusCodes.BAD_REQUEST);
  }
  if (isUserExists.status === "DELETED" || isUserExists.isDeleted) {
    throw new AppError("Credential deleted.", StatusCodes.BAD_REQUEST);
  }
  if (!isUserExists.emailVerified) {
    throw new AppError("Patient not verified", StatusCodes.BAD_REQUEST);
  }
  if (isUserExists.authProvider !== "CREDENTIAL") {
    throw new AppError("Google auth provider.", StatusCodes.BAD_REQUEST);
  }
  const otp = crypto.randomInt(10000, 100000);
  const key = `forgetPassword-otp:${isUserExists.email}`;
  const expirationSeconds = 5 * 60;
  await redisClient.set(key, otp, {
    expiration: {
      type: "EX",
      value: expirationSeconds,
    },
  });
  const templatePath = path.join(
    process.cwd(),
    "src/app/templates/forget_password.ejs",
  );
  const templateData = {
    name: isUserExists.name,
    OTP: otp,
    expirationMinutes: expirationSeconds / 60,
    year: new Date().getFullYear(),
  };
  const html = await ejs.renderFile(templatePath, templateData);
  await transporter.sendMail({
    from: `${envVars.EMAIL_SENDER_NAME} ${envVars.EMAIL_SENDER}`,
    to: isUserExists.email,
    subject: "Password Reset Verification Code",
    html,
  });
};

const resetPassword = async (payload: IResetPasswordPayload) => {
  const { email, newPassword, otp } = payload;
  const isUserExists = await prisma.user.findUnique({
    where: {
      email,
    },
  });
  if (!isUserExists) {
    throw new AppError("Credential not found.", StatusCodes.BAD_REQUEST);
  }
  if (isUserExists.status === "BLOCKED") {
    throw new AppError("Credential blocked.", StatusCodes.BAD_REQUEST);
  }
  if (isUserExists.status === "DELETED" || isUserExists.isDeleted) {
    throw new AppError("Credential deleted.", StatusCodes.BAD_REQUEST);
  }
  if (!isUserExists.emailVerified) {
    throw new AppError("Patient not verified", StatusCodes.BAD_REQUEST);
  }
  if (isUserExists.authProvider !== "CREDENTIAL") {
    throw new AppError("Google auth provider.", StatusCodes.BAD_REQUEST);
  }
  const key = `forgetPassword-otp:${isUserExists.email}`;

  const redisOTP = await redisClient.get(key);
  if (!redisOTP) {
    throw new AppError("Invalid OTP.", StatusCodes.BAD_REQUEST);
  }
  if (redisOTP.toString() !== otp.toString()) {
    throw new AppError("OTP mismatch.", StatusCodes.BAD_REQUEST);
  }

  const hashedNewPassword = await bcrypt.hash(
    newPassword,
    Number(envVars.BCRYPT_SALT_ROUNDS),
  );
  await prisma.user.update({
    where: {
      email: isUserExists.email,
    },
    data: {
      password: hashedNewPassword,
    },
  });
  await redisClient.del(key);

  const templatePath = path.join(
    process.cwd(),
    "src/app/templates/reset_password_success.ejs",
  );
  const templateData = {
    name: isUserExists.name,
    OTP: otp,
    year: new Date().getFullYear(),
  };
  const html = await ejs.renderFile(templatePath, templateData);

  await transporter.sendMail({
    from: `${envVars.EMAIL_SENDER_NAME} ${envVars.EMAIL_SENDER}`,
    to: isUserExists.email,
    subject: "Password Reset Successful",
    html,
  });
};

export const AuthService = {
  registerPatient,
  loginUser,
  getMe,
  refreshToken,
  googleLogin,
  forgetPassword,
  resetPassword,
  verifyPatientEmail,
};
