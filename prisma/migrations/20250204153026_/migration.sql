/*
  Warnings:

  - The `delete_for` column on the `message` table would be dropped and recreated. This will lead to data loss if there is data in the column.

*/
-- AlterTable
ALTER TABLE "message" DROP COLUMN "delete_for",
ADD COLUMN     "delete_for" INTEGER[];
