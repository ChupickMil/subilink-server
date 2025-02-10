/*
  Warnings:

  - You are about to drop the column `deleteFor` on the `chat` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "chat" DROP COLUMN "deleteFor",
ADD COLUMN     "delete_for" TEXT[],
ADD COLUMN     "deleted_at" TIMESTAMP(3);
