import dotenv from "dotenv";

dotenv.config();
type INodeEnv = "development" | "production";
interface EnvVariables {
  NODE_ENV: INodeEnv;
  PORT: string;
  DATABASE_URL: string;
  LOCAL_BACKEND_URL: string;
  FRONTEND_URL: string;
  BCRYPT_SALT_ROUNDS: string;
  JWT_ACCESS_SECRET: string;
  JWT_REFRESH_SECRET: string;
  JWT_ACCESS_EXPIRES_IN: string;
  JWT_REFRESH_EXPIRES_IN: string;
  GOOGLE_CLIENT_ID: string;
  GOOGLE_CLIENT_SECRET: string;
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
  };
};

export const envVars = loadEnvVariables();
