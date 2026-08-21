import { createClient } from "redis";
import { envVars } from "../config";

export const redisClient = createClient({
  username: envVars.REDIS_USER_NAME,
  password: envVars.REDIS_PASSWORD,
  socket: {
    host: envVars.REDIS_HOST,
    port: Number(envVars.REDIS_PORT),
  },
});
