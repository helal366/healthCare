import * as z from "zod";

const applyDoctorZodSchema = z.object({
  user: z.object({
    name: z
      .string("Not a string!!!")
      .trim()
      .min(2, "Must be atleast 2 character."),
    email: z.email("Invalid email format!!!"),
    password: z.string().min(6, "Minimum 6 characters required!!!"),
    role: z.enum(["PATIENT", "DOCTOR", "ADMIN"]).optional(),
    status: z.enum(["ACTIVE", "INACTIVE"]).optional(),
    needPasswordChange: z.boolean().optional(),
  }),
  doctor: z.object({
    address: z.string().trim().optional(),
    specialization: z.string().trim().min(2, "Must be atleast 2 character."),
    licenseNumber: z.string().trim().min(2, "Must be atleast 2 character."),
    qualifications: z.string().trim().min(2, "Must be atleast 2 character."),
    experienceYears: z
      .number()
      .int("Experience years must be an integer")
      .min(0, "Experience years must be a non-negative integer."),
    bio: z.string().trim().optional(),
    consultationFee: z
      .number()
      .min(100, "Consultation fee must be at least 100.")
      .optional(),
    contactNo: z
      .string()
      .trim()
      .min(11, "Bangladeshi contact number must be 11 digits long."),
    verificationStatus: z.enum(["PENDING", "APPROVED", "REJECTED"]).optional(),
    rejectionReason: z.string().optional(),
    reviewedBy: z.string().optional(),
    reviewedAt: z.string().optional(),
  }),
});

export const DoctorValidation = {
  applyDoctorZodSchema,
};
