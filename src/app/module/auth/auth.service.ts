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
  IGoogleLoginPayload,
  ILoginUserPayload,
  IRegisterPatientPayload,
  IRequestUser,
} from "./auth.interface";
import { envVars } from "../../config";
import { TokenPayload } from "google-auth-library";
import { googleClient } from "../../lib/googleAuth";
import { AppError } from "../../helperFunctions/globalErrorHelper";
import { StatusCodes } from "http-status-codes";

const registerPatient = async (payload: IRegisterPatientPayload) => {
  const { name, password } = payload;
  const email = payload.email.trim().toLowerCase();

  const isUserExists = await prisma.user.findUnique({
    where: { email },
  });

  if (isUserExists) {
    throw new Error("User with this email already exists");
  }

  const hashedPassword = await bcrypt.hash(password, 8);

  const createdUser = await prisma.user.create({
    data: {
      name,
      email,
      password: hashedPassword,
      role: Role.PATIENT,
      status: UserStatus.ACTIVE,
      emailVerified: false,
      patient: {
        create: { name, email },
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
    throw new AppError("User is blocked", StatusCodes.UNAUTHORIZED);
  }

  if (user.isDeleted || user.status === UserStatus.DELETED) {
    throw new AppError("User is deleted", StatusCodes.UNAUTHORIZED);
  }

  if(!user.password && user.googleId){
	throw new AppError(`Credentials found with Google email: ${user.email}`, StatusCodes.BAD_REQUEST)
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
	if(isPatientExistsWithCredentials){
		if(isPatientExistsWithCredentials.status === UserStatus.BLOCKED){
			throw new AppError("User is blocked", StatusCodes.UNAUTHORIZED)
		};
		if(isPatientExistsWithCredentials.status===UserStatus.DELETED){
			throw new AppError("User is deleted", StatusCodes.UNAUTHORIZED);
		}
		user = await prisma.user.update({
			where:{
				email: googleIdTokenPayload.email,
				role: Role.PATIENT
			},
			data:{
				googleId: googleIdTokenPayload.sub
			}
		})
	}else{
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
		if(!user){
			throw new AppError("User not found", StatusCodes.NOT_FOUND)
		}
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
export const AuthService = {
  registerPatient,
  loginUser,
  getMe,
  refreshToken,
  googleLogin,
};
