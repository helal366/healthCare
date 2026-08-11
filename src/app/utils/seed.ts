import bcrypt from "bcryptjs";
import { Role } from "../../generated/prisma/enums";
import { envVars } from "../config";
import { prisma } from "../lib/prisma";

export const seedSuperAdmin = async () => {
  try {
    const isSuperAdminExists = await prisma.user.findFirst({
      where: {
        role: Role.SUPER_ADMIN,
      },
    });
    if (isSuperAdminExists) {
      console.log("Super admin exists.");
      return;
    }
    const hashedPassword = await bcrypt.hash(
      envVars.SUPER_ADMIN_PASSWORD,
      Number(envVars.BCRYPT_SALT_ROUNDS),
    );
    const superAdmin = await prisma.user.create({
      data: {
        name: envVars.SUPER_ADMIN_NAME,
        email: envVars.SUPER_ADMIN_EMAIL,
        password: hashedPassword,
        role: Role.SUPER_ADMIN,
      },
    });
    console.log("Super admin: ", superAdmin);
  } catch (error) {
    console.log("Error seeding super admin: ", error);
    const exists = await prisma.user.findFirst({
      where: {
        email: envVars.SUPER_ADMIN_EMAIL,
      },
    });
    if (exists) {
      await prisma.user.delete({
        where: {
          email: envVars.SUPER_ADMIN_EMAIL,
        },
      });
    }
  }
};
