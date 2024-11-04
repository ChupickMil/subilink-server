/*
  Warnings:

  - A unique constraint covering the columns `[oauth]` on the table `twofa` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "twofa" ALTER COLUMN "oauth" DROP NOT NULL,
ALTER COLUMN "oauth" SET DATA TYPE TEXT,
ALTER COLUMN "autentificator_code" DROP NOT NULL,
ALTER COLUMN "autentificator_code" SET DATA TYPE TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "twofa_oauth_key" ON "twofa"("oauth");
