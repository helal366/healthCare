import dotenv from "dotenv";

dotenv.config();
type INodeEnv = "development" | "production";
interface EnvVariables {
  NODE_ENV: INodeEnv;
  PORT: string;
  DATABASE_URL: string;
  LOCAL_BACKEND_URL: string;
  FRONTEND_URL: string;
  JWT_ACCESS_SECRET: string;
  JWT_REFRESH_SECRET: string;
  JWT_ACCESS_EXPIRES_IN: string;
  JWT_REFRESH_EXPIRES_IN: string;
  BCRYPT_SALT_ROUNDS: string;
  GOOGLE_CLIENT_ID: string;
  GOOGLE_CLIENT_SECRET: string;
  SUPER_ADMIN_NAME: string;
  SUPER_ADMIN_EMAIL: string;
  SUPER_ADMIN_PASSWORD: string;
  TESTER_ADMIN_NAME: string;
  TESTER_ADMIN_EMAIL: string;
  TESTER_ADMIN_PASSWORD: string;
  TESTER_DOCTOR_NAME: string;
  TESTER_DOCTOR_EMAIL: string;
  TESTER_DOCTOR_PASSWORD: string;
  REDIS_USER_NAME: string;
  REDIS_PASSWORD: string;
  REDIS_HOST: string;
  REDIS_PORT: string;
  SMTP_USERNAME: string;
  SMTP_PASSWORD: string;
  EMAIL_SENDER: string;
  EMAIL_SENDER_NAME: string;
  CLOUDINARY_CLOUD_NAME: string;
  CLOUDINARY_API_KEY: string;
  CLOUDINARY_API_SECRET: string;
  BKASH_USERNAME: string;
  BKASH_PASSWORD: string;
  BKASH_APP_KEY: string;
  BKASH_APP_SECRET: string;
  BKASH_BASE_URL: string;
  BKASH_CALLBACK_URL: string;
}

const loadEnvVariables = (): EnvVariables => {
  const envVars: string[] = [
    "NODE_ENV",
    "PORT",
    "DATABASE_URL",
    "LOCAL_BACKEND_URL",
    "FRONTEND_URL",
    "BCRYPT_SALT_ROUNDS",
    "JWT_ACCESS_SECRET",
    "JWT_REFRESH_SECRET",
    "JWT_ACCESS_EXPIRES_IN",
    "JWT_REFRESH_EXPIRES_IN",
    "GOOGLE_CLIENT_ID",
    "GOOGLE_CLIENT_SECRET",
    "SUPER_ADMIN_NAME",
    "SUPER_ADMIN_EMAIL",
    "SUPER_ADMIN_PASSWORD",
    "TESTER_ADMIN_NAME",
    "TESTER_ADMIN_EMAIL",
    "TESTER_ADMIN_PASSWORD",
    "TESTER_DOCTOR_NAME",
    "TESTER_DOCTOR_EMAIL",
    "TESTER_DOCTOR_PASSWORD",
    "REDIS_USER_NAME",
    "REDIS_PASSWORD",
    "REDIS_HOST",
    "REDIS_PORT",
    "SMTP_USERNAME",
    "SMTP_PASSWORD",
    "EMAIL_SENDER",
    "EMAIL_SENDER_NAME",
    "CLOUDINARY_CLOUD_NAME",
    "CLOUDINARY_API_KEY",
    "CLOUDINARY_API_SECRET",
    "BKASH_USERNAME",
    "BKASH_PASSWORD",
    "BKASH_APP_KEY",
    "BKASH_APP_SECRET",
    "BKASH_BASE_URL",
    "BKASH_CALLBACK_URL",
  ];
  envVars.forEach((element) => {
    if (!process.env[element]) {
      throw new Error(`Required environmental variable missing: ${element}`);
    }
  });
  return {
    NODE_ENV: process.env.NODE_ENV as INodeEnv,
    PORT: process.env.PORT as string,
    DATABASE_URL: process.env.DATABASE_URL as string,
    LOCAL_BACKEND_URL: process.env.LOCAL_BACKEND_URL as string,
    FRONTEND_URL: process.env.FRONTEND_URL as string,
    BCRYPT_SALT_ROUNDS: process.env.BCRYPT_SALT_ROUNDS as string,
    JWT_ACCESS_SECRET: process.env.JWT_ACCESS_SECRET as string,
    JWT_REFRESH_SECRET: process.env.JWT_REFRESH_SECRET as string,
    JWT_ACCESS_EXPIRES_IN: process.env.JWT_ACCESS_EXPIRES_IN as string,
    JWT_REFRESH_EXPIRES_IN: process.env.JWT_REFRESH_EXPIRES_IN as string,
    GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID as string,
    GOOGLE_CLIENT_SECRET: process.env.GOOGLE_CLIENT_SECRET as string,
    SUPER_ADMIN_NAME: process.env.SUPER_ADMIN_NAME as string,
    SUPER_ADMIN_EMAIL: process.env.SUPER_ADMIN_EMAIL as string,
    SUPER_ADMIN_PASSWORD: process.env.SUPER_ADMIN_PASSWORD as string,
    TESTER_ADMIN_NAME: process.env.TESTER_ADMIN_NAME as string,
    TESTER_ADMIN_EMAIL: process.env.TESTER_ADMIN_EMAIL as string,
    TESTER_ADMIN_PASSWORD: process.env.TESTER_ADMIN_PASSWORD as string,
    TESTER_DOCTOR_NAME: process.env.TESTER_DOCTOR_NAME as string,
    TESTER_DOCTOR_EMAIL: process.env.TESTER_DOCTOR_EMAIL as string,
    TESTER_DOCTOR_PASSWORD: process.env.TESTER_DOCTOR_PASSWORD as string,
    REDIS_USER_NAME: process.env.REDIS_USER_NAME as string,
    REDIS_PASSWORD: process.env.REDIS_PASSWORD as string,
    REDIS_HOST: process.env.REDIS_HOST as string,
    REDIS_PORT: process.env.REDIS_PORT as string,
    SMTP_USERNAME: process.env.SMTP_USERNAME as string,
    SMTP_PASSWORD: process.env.SMTP_PASSWORD as string,
    EMAIL_SENDER: process.env.EMAIL_SENDER as string,
    EMAIL_SENDER_NAME: process.env.EMAIL_SENDER_NAME as string,
    CLOUDINARY_CLOUD_NAME: process.env.CLOUDINARY_CLOUD_NAME as string,
    CLOUDINARY_API_KEY: process.env.CLOUDINARY_API_KEY as string,
    CLOUDINARY_API_SECRET: process.env.CLOUDINARY_API_SECRET as string,
    BKASH_USERNAME: process.env.BKASH_USERNAME as string,
    BKASH_PASSWORD: process.env.BKASH_PASSWORD as string,
    BKASH_APP_KEY: process.env.BKASH_APP_KEY as string,
    BKASH_APP_SECRET: process.env.BKASH_APP_SECRET as string,
    BKASH_BASE_URL: process.env.BKASH_BASE_URL as string,
    BKASH_CALLBACK_URL: process.env.BKASH_CALLBACK_URL as string,
  };
};

export const envVars = loadEnvVariables();
