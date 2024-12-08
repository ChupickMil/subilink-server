/*
  Warnings:

  - A unique constraint covering the columns `[first_user]` on the table `chat` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[second_user]` on the table `chat` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `first_user` to the `chat` table without a default value. This is not possible if the table is not empty.
  - Added the required column `second_user` to the `chat` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "chat" ADD COLUMN     "first_user" INTEGER NOT NULL,
ADD COLUMN     "second_user" INTEGER NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "chat_first_user_key" ON "chat"("first_user");

-- CreateIndex
CREATE UNIQUE INDEX "chat_second_user_key" ON "chat"("second_user");

-- AddForeignKey
ALTER TABLE "chat" ADD CONSTRAINT "chat_first_user_fkey" FOREIGN KEY ("first_user") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "chat" ADD CONSTRAINT "chat_second_user_fkey" FOREIGN KEY ("second_user") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
