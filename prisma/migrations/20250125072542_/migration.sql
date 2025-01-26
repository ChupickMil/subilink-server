/*
  Warnings:

  - You are about to drop the column `file_uuids` on the `message` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "message" DROP COLUMN "file_uuids",
ADD COLUMN     "file_id" INTEGER;

-- AddForeignKey
ALTER TABLE "message" ADD CONSTRAINT "message_file_id_fkey" FOREIGN KEY ("file_id") REFERENCES "file"("id") ON DELETE SET NULL ON UPDATE CASCADE;
