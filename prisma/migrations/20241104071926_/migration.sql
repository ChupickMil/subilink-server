/*
  Warnings:

  - You are about to drop the `users` table. If the table is not empty, all the data it contains will be lost.
  - Added the required column `oauth` to the `twofa` table without a default value. This is not possible if the table is not empty.
  - Added the required column `autentificator_code` to the `twofa` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "RolesInChat" AS ENUM ('creator', 'admin', 'user');

-- CreateEnum
CREATE TYPE "Themes" AS ENUM ('system', 'light', 'dark');

-- CreateEnum
CREATE TYPE "Fonts" AS ENUM ('roboto');

-- CreateEnum
CREATE TYPE "FriendStatuses" AS ENUM ('pending', 'confirmed', 'blocked');

-- DropIndex
DROP INDEX "twofa_oauth_key";

-- AlterTable
ALTER TABLE "twofa" DROP COLUMN "oauth",
ADD COLUMN     "oauth" BOOLEAN NOT NULL,
DROP COLUMN "autentificator_code",
ADD COLUMN     "autentificator_code" BOOLEAN NOT NULL;

-- DropTable
DROP TABLE "users";

-- CreateTable
CREATE TABLE "user" (
    "id" SERIAL NOT NULL,
    "phone" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT,
    "password" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "update_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "setting" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "theme" "Themes" NOT NULL,
    "font" "Fonts" NOT NULL,
    "font_size" INTEGER NOT NULL,

    CONSTRAINT "setting_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "chat" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "creator_id" INTEGER NOT NULL,
    "is_group" BOOLEAN NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "chat_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "message" (
    "id" SERIAL NOT NULL,
    "sender_id" INTEGER NOT NULL,
    "chat_id" INTEGER NOT NULL,
    "read_at" TIMESTAMP(3),
    "content" TEXT,
    "img_url" TEXT,
    "video_url" TEXT,
    "deleted_at" TIMESTAMP(3) NOT NULL,
    "send_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "message_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "chat_participant" (
    "id" SERIAL NOT NULL,
    "chat_id" INTEGER NOT NULL,
    "user_id" INTEGER NOT NULL,
    "joined_at" TIMESTAMP(3) NOT NULL,
    "role" "RolesInChat" NOT NULL,

    CONSTRAINT "chat_participant_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "friend" (
    "id" SERIAL NOT NULL,
    "follower_id" INTEGER NOT NULL,
    "followed_id" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL,
    "status" "FriendStatuses" NOT NULL,

    CONSTRAINT "friend_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "user_id_key" ON "user"("id");

-- CreateIndex
CREATE UNIQUE INDEX "user_phone_key" ON "user"("phone");

-- CreateIndex
CREATE UNIQUE INDEX "user_email_key" ON "user"("email");

-- CreateIndex
CREATE UNIQUE INDEX "setting_id_key" ON "setting"("id");

-- CreateIndex
CREATE UNIQUE INDEX "setting_user_id_key" ON "setting"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "chat_id_key" ON "chat"("id");

-- CreateIndex
CREATE UNIQUE INDEX "chat_creator_id_key" ON "chat"("creator_id");

-- CreateIndex
CREATE UNIQUE INDEX "message_id_key" ON "message"("id");

-- CreateIndex
CREATE UNIQUE INDEX "message_sender_id_key" ON "message"("sender_id");

-- CreateIndex
CREATE UNIQUE INDEX "message_chat_id_key" ON "message"("chat_id");

-- CreateIndex
CREATE UNIQUE INDEX "chat_participant_id_key" ON "chat_participant"("id");

-- CreateIndex
CREATE UNIQUE INDEX "chat_participant_chat_id_key" ON "chat_participant"("chat_id");

-- CreateIndex
CREATE UNIQUE INDEX "chat_participant_user_id_key" ON "chat_participant"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "friend_id_key" ON "friend"("id");

-- AddForeignKey
ALTER TABLE "twofa" ADD CONSTRAINT "twofa_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "setting" ADD CONSTRAINT "setting_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "chat" ADD CONSTRAINT "chat_creator_id_fkey" FOREIGN KEY ("creator_id") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "message" ADD CONSTRAINT "message_sender_id_fkey" FOREIGN KEY ("sender_id") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "message" ADD CONSTRAINT "message_chat_id_fkey" FOREIGN KEY ("chat_id") REFERENCES "chat"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "chat_participant" ADD CONSTRAINT "chat_participant_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "chat_participant" ADD CONSTRAINT "chat_participant_chat_id_fkey" FOREIGN KEY ("chat_id") REFERENCES "chat"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "friend" ADD CONSTRAINT "friend_followed_id_fkey" FOREIGN KEY ("followed_id") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "friend" ADD CONSTRAINT "friend_follower_id_fkey" FOREIGN KEY ("follower_id") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
