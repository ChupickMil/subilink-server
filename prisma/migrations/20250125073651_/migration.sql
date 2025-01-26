/*
  Warnings:

  - You are about to drop the column `file_id` on the `message` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE "message" DROP CONSTRAINT "message_file_id_fkey";

-- AlterTable
ALTER TABLE "message" DROP COLUMN "file_id";

-- CreateTable
CREATE TABLE "_FileToMessage" (
    "A" INTEGER NOT NULL,
    "B" INTEGER NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "_FileToMessage_AB_unique" ON "_FileToMessage"("A", "B");

-- CreateIndex
CREATE INDEX "_FileToMessage_B_index" ON "_FileToMessage"("B");

-- AddForeignKey
ALTER TABLE "_FileToMessage" ADD CONSTRAINT "_FileToMessage_A_fkey" FOREIGN KEY ("A") REFERENCES "file"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_FileToMessage" ADD CONSTRAINT "_FileToMessage_B_fkey" FOREIGN KEY ("B") REFERENCES "message"("id") ON DELETE CASCADE ON UPDATE CASCADE;
