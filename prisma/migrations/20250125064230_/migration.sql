/*
  Warnings:

  - You are about to drop the column `img_uuids` on the `message` table. All the data in the column will be lost.
  - You are about to drop the column `video_url` on the `message` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "message" DROP COLUMN "img_uuids",
DROP COLUMN "video_url",
ADD COLUMN     "file_uuids" TEXT[];
