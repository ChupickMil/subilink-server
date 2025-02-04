/*
  Warnings:

  - You are about to drop the column `deleteFor` on the `message` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "message" DROP COLUMN "deleteFor",
ADD COLUMN     "delete_for" TEXT[];
