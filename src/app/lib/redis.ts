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

// redisClient.on("error", (err) => console.log("Redis Client Error", err));

// await redisClient.connect();

// await redisClient.set("foo", "bar");
// const result = await redisClient.get("foo");
// console.log(result); // >>> bar
