import z4, { z } from "zod/v4";

export const authRegistrationZodSchema= z4.object({
    name: z.string("Not a string!!!").min(2, "Must be atleast 2 character."),
    email: z.email("Invalid email format!!!"),
    password: z.string()
            .min(6, "Minimum 6 characters required!!!")
            .regex(/[a-z]/, "Atleast one lowercase letter required.")
            .regex(/[A-Z]/, "Atleast one uppercase letter required.")
            .regex(/^A-Za-z0-9/, "Atleast one special character required")
})