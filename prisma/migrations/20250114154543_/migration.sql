/*
  Warnings:

  - The `img_url` column on the `message` table would be dropped and recreated. This will lead to data loss if there is data in the column.

*/
-- AlterTable
ALTER TABLE "message" DROP COLUMN "img_url",
ADD COLUMN     "img_url" TEXT[];
