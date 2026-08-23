/*
  Warnings:

  - You are about to drop the column `licenceNumber` on the `doctors` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[licenseNumber]` on the table `doctors` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `licenseNumber` to the `doctors` table without a default value. This is not possible if the table is not empty.

*/
-- DropIndex
DROP INDEX "doctors_licenceNumber_key";

-- AlterTable
ALTER TABLE "doctors" DROP COLUMN "licenceNumber",
ADD COLUMN     "licenseNumber" TEXT NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "doctors_licenseNumber_key" ON "doctors"("licenseNumber");
