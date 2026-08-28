import cron from "node-cron";
import { prisma } from "./prisma";
import { DoctorVerificationStatus, Role } from "../../generated/prisma/enums";

export const deleteUnverifiedDoctors = async () => {
  cron.schedule("*/10 * * * *", async () => {
    //prisma business logics to delete doctors
    try {
      const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
      const deletedDoctors = await prisma.user.deleteMany({
        where: {
          role: Role.DOCTOR,
          emailVerified: false,
          createdAt: { lt: oneHourAgo },
          doctor: {
            verificationStatus: DoctorVerificationStatus.PENDING,
          },
        },
      });
      if (deletedDoctors.count > 0) {
        console.log(
          `Cron: Deleted ${deletedDoctors.count} unverified doctors' application older than 1 hour.`,
        );
      } else {
        console.log("Cron: No application deleted at this round.");
      }
    } catch (error) {
      console.log(`Cron: Failed to delete unverified doctors' applications`);
    }
  });
};
