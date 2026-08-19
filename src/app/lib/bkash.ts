import { envVars } from "../config"
import { redisClient } from "./redis";

interface RedisSetPayload {
  id_token: string;
  refresh_token:string;
};

interface BkashTokenResponse {
  id_token: string;
  refresh_token: string;
  statusCode: string;
  statusMessage: string;
  expires_in: number;
}


const storeIdTokenRefreshTokenInRedis = async ({
  id_token,
  refresh_token,
}: RedisSetPayload) => {
  const bkashIdTokenKey = "bkash:idToken";
  const bkashRefreshToken = "bkash:refreshToken";

  await redisClient.set(bkashIdTokenKey, id_token, {
    expiration: {
      type: "EX",
      value: 60 *60 ,
    },
  });

  await redisClient.set(bkashRefreshToken, refresh_token, {
    expiration: {
      type: "EX",
      value: 60 * 60 * 24 * 28,
    },
  });
};


export const getBkashIdToken = async (): Promise<RedisSetPayload> => {
  try {
    const bkashIdTokenKey = "bksah:idToken";
    const bkashRefreshToken = "bkash:refreshToken";

    const bkashIdTokenFromRedis = await redisClient.get(bkashIdTokenKey);
    const bkashRefreshTokenFromRedis = await redisClient.get(bkashRefreshToken);

    const bkashIdTokenTTL = await redisClient.ttl(bkashIdTokenKey);
    const bkashRefreshTokenTTL = await redisClient.ttl(bkashRefreshToken);

    // idtoken generation
    if ((!bkashIdTokenFromRedis || bkashIdTokenTTL <= 600 ) && bkashRefreshTokenFromRedis && bkashRefreshTokenTTL>600) {
      const response = await fetch(
        `${envVars.BKASH_BASE_URL}/tokenized/checkout/token/refresh`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Accept: "application / json",
            username: envVars.BKASH_USERNAME,
            password: envVars.BKASH_PASSWORD,
          },
          body: JSON.stringify({
            app_key: envVars.BKASH_APP_KEY,
            app_secret: envVars.BKASH_APP_SECRET,
            refresh_token: bkashRefreshTokenFromRedis,
          }),
        },
      );
      if (!response.ok) {
        throw new Error("bKash ID token grant failed.");
      }
      const result: BkashTokenResponse = await response.json();


      await storeIdTokenRefreshTokenInRedis({
        id_token: result.id_token,
        refresh_token: result.refresh_token,
      });

      return {
        id_token: result.id_token,
        refresh_token: result.refresh_token,
      };
    }

    // return id token and refresh token
    if (bkashIdTokenFromRedis && bkashIdTokenTTL>600 && bkashRefreshTokenFromRedis && bkashRefreshTokenTTL>600) {
      return {
        id_token: bkashIdTokenFromRedis,
        refresh_token: bkashRefreshTokenFromRedis,
      };
    }

    // bkash grant route
    const response = await fetch(
      `${envVars.BKASH_BASE_URL}/tokenized/checkout/token/grant`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application / json",
          username: envVars.BKASH_USERNAME,
          password: envVars.BKASH_PASSWORD,
        },
        body: JSON.stringify({
          app_key: envVars.BKASH_APP_KEY,
          app_secret: envVars.BKASH_APP_SECRET,
        }),
      },
    );
    if (!response.ok) {
      throw new Error("bKash ID token grant failed.");
    }
    const result: BkashTokenResponse = await response.json();
    await storeIdTokenRefreshTokenInRedis({
      id_token: result.id_token,
      refresh_token: result.refresh_token,
    });

    return {
      id_token: result.id_token,
      refresh_token: result.refresh_token,
    };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "bKash ID token grant failed.";
    throw new Error(message);
  }
};



/**
 * Sample Request
 * POST /tokenized/checkout/token/grant HTTP/1.1
Host: {base_URL}
Content-Type: application/json
Accept: application/json
username: username
password: password

{  
   "app_key": "test_app_key",
   "app_secret": "test_app_secret"
}
 */