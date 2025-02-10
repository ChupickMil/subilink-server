/*
  Warnings:

  - The `delete_for` column on the `chat` table would be dropped and recreated. This will lead to data loss if there is data in the column.

*/
-- AlterTable
ALTER TABLE "chat" DROP COLUMN "delete_for",
ADD COLUMN     "delete_for" INTEGER[];
