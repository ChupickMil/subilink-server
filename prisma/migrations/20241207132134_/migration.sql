/*
  Warnings:

  - You are about to drop the `Group` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "Group" DROP CONSTRAINT "Group_creator_id_fkey";

-- DropForeignKey
ALTER TABLE "chat_participant" DROP CONSTRAINT "chat_participant_group_id_fkey";

-- DropForeignKey
ALTER TABLE "message" DROP CONSTRAINT "message_group_id_fkey";

-- DropTable
DROP TABLE "Group";

-- CreateTable
CREATE TABLE "group" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "creator_id" INTEGER NOT NULL,

    CONSTRAINT "group_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "group_id_key" ON "group"("id");

-- CreateIndex
CREATE UNIQUE INDEX "group_creator_id_key" ON "group"("creator_id");

-- AddForeignKey
ALTER TABLE "group" ADD CONSTRAINT "group_creator_id_fkey" FOREIGN KEY ("creator_id") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "message" ADD CONSTRAINT "message_group_id_fkey" FOREIGN KEY ("group_id") REFERENCES "group"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "chat_participant" ADD CONSTRAINT "chat_participant_group_id_fkey" FOREIGN KEY ("group_id") REFERENCES "group"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
