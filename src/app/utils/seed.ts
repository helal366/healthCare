import bcrypt from "bcryptjs";
import { Role } from "../../generated/prisma/enums";
import { envVars } from "../config";
import { prisma } from "../lib/prisma";
import { email } from "zod";

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
        needPasswordChange:false,
        emailVerified: true
      },
    });
    console.log("Super admin: ", superAdmin);
  } catch (error) {
    console.log("Error seeding super admin: ", {error});
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

export const seedTesterAdmin= async()=>{
    try {
        const isTesterAdmin= await prisma.user.findFirst({
            where: {
                email: envVars.TESTER_ADMIN_EMAIL
            }
        });
        if(isTesterAdmin){
            console.log("Tester admin exists");
            return;
        };
        const hashedPassword = await bcrypt.hash(envVars.TESTER_ADMIN_PASSWORD, Number(envVars.BCRYPT_SALT_ROUNDS))
        const testerAdmin = await prisma.user.create({
          data: {
            name: envVars.TESTER_ADMIN_NAME,
            email: envVars.TESTER_ADMIN_EMAIL,
            password: hashedPassword,
            role: Role.ADMIN,
            needPasswordChange: false,
            emailVerified: true,
          },
        });
        console.log("Tester admin: ", testerAdmin)
    } catch (error) {
        console.log("Error creating tester admin. ", {error});
        const exists= await prisma.user.findFirst({
            where:{
                email: envVars.TESTER_ADMIN_EMAIL
            }
        });
        if(exists){
            await prisma.user.delete({
                where: {
                    email: envVars.TESTER_ADMIN_EMAIL
                }
            })
        }
    }
};

export const seedTesterDoctor=async()=>{
    try {
        const isTesterDoctorExists=await prisma.user.findUnique({
            where:{
                email: envVars.TESTER_DOCTOR_EMAIL
            }
        });
        if(isTesterDoctorExists){
            console.log("Tester doctor exists");
            return;
        };
        const hashedPassword = await bcrypt.hash(envVars.TESTER_DOCTOR_PASSWORD, Number(envVars.BCRYPT_SALT_ROUNDS));
        const testerDoctor = await prisma.user.create({
          data: {
            name: envVars.TESTER_DOCTOR_NAME,
            email: envVars.TESTER_DOCTOR_EMAIL,
            password: hashedPassword,
            role: Role.DOCTOR,
            needPasswordChange: false,
            emailVerified: true,
          },
        });
        console.log("Tester doctor: ", testerDoctor)
    } catch (error) {
        console.log("Error creating tester doctor. ", {error});
        const exists = await prisma.user.findUnique({
          where: {
            email: envVars.TESTER_DOCTOR_EMAIL,
          },
        });
        if (exists) {
          await prisma.user.delete({
            where: {
              email: envVars.TESTER_DOCTOR_EMAIL,
            },
          });
        }
    }
}