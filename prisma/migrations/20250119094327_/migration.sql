/*
  Warnings:

  - You are about to drop the column `img_url` on the `message` table. All the data in the column will be lost.
  - Added the required column `type` to the `file` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "file" ADD COLUMN     "type" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "message" DROP COLUMN "img_url",
ADD COLUMN     "img_uuids" TEXT[];
