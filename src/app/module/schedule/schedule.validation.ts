import z from "zod";

export const CreateSchemaValidationZodSchema= z.object({
    startDateTime: z.coerce.date("Invalid startDateTime"),
    endDateTime: z.coerce.date("Invalid endDateTime"),
    meetingLink: z.url("Invalid meeting link.").trim()
})
export const UpdateSchemaValidationZodSchema= z.object({
    startDateTime: z.coerce.date("Invalid startDateTime").optional(),
    endDateTime: z.coerce.date("Invalid endDateTime").optional(),
    meetingLink: z.url("Invalid meeting link.").trim().optional()
})