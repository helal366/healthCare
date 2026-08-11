import { NextFunction, Request, Response } from "express";
import { catchAsync } from "../utils/catchAsync";
import z4 from "zod/v4";

export const validateZodSchema=(zodSchema: z4.ZodObject)=>{
    return catchAsync(async(req:Request, res:Response, next:NextFunction)=>{
        try {           
            const payload = req.body ?? {};
            const result = zodSchema.safeParse(payload);
            if(!result.success){
                throw new Error(result.error.issues[0].message)
            };
            req.body = result.data;
            next();
        } catch (error) {
            next(error)
        }
    })
}