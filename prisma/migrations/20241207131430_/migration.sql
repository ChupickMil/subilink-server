/*
  Warnings:

  - You are about to drop the column `creator_id` on the `chat` table. All the data in the column will be lost.
  - You are about to drop the column `is_group` on the `chat` table. All the data in the column will be lost.
  - You are about to drop the column `name` on the `chat` table. All the data in the column will be lost.
  - You are about to drop the column `chat_id` on the `chat_participant` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[group_id]` on the table `chat_participant` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[group_id]` on the table `message` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `group_id` to the `chat_participant` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "chat" DROP CONSTRAINT "chat_creator_id_fkey";

-- DropForeignKey
ALTER TABLE "chat_participant" DROP CONSTRAINT "chat_participant_chat_id_fkey";

-- DropForeignKey
ALTER TABLE "message" DROP CONSTRAINT "message_chat_id_fkey";

-- DropIndex
DROP INDEX "chat_creator_id_key";

-- DropIndex
DROP INDEX "chat_participant_chat_id_key";

-- DropIndex
DROP INDEX "message_id_key";

-- AlterTable
ALTER TABLE "chat" DROP COLUMN "creator_id",
DROP COLUMN "is_group",
DROP COLUMN "name";

-- AlterTable
ALTER TABLE "chat_participant" DROP COLUMN "chat_id",
ADD COLUMN     "group_id" INTEGER NOT NULL;

-- AlterTable
ALTER TABLE "message" ADD COLUMN     "group_id" INTEGER,
ALTER COLUMN "chat_id" DROP NOT NULL,
ALTER COLUMN "deleted_at" DROP NOT NULL,
ALTER COLUMN "send_at" SET DEFAULT CURRENT_TIMESTAMP;

-- CreateTable
CREATE TABLE "Group" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "creator_id" INTEGER NOT NULL,

    CONSTRAINT "Group_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Group_id_key" ON "Group"("id");

-- CreateIndex
CREATE UNIQUE INDEX "Group_creator_id_key" ON "Group"("creator_id");

-- CreateIndex
CREATE UNIQUE INDEX "chat_participant_group_id_key" ON "chat_participant"("group_id");

-- CreateIndex
CREATE UNIQUE INDEX "message_group_id_key" ON "message"("group_id");

-- AddForeignKey
ALTER TABLE "Group" ADD CONSTRAINT "Group_creator_id_fkey" FOREIGN KEY ("creator_id") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "message" ADD CONSTRAINT "message_chat_id_fkey" FOREIGN KEY ("chat_id") REFERENCES "chat"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "message" ADD CONSTRAINT "message_group_id_fkey" FOREIGN KEY ("group_id") REFERENCES "Group"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "chat_participant" ADD CONSTRAINT "chat_participant_group_id_fkey" FOREIGN KEY ("group_id") REFERENCES "Group"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
