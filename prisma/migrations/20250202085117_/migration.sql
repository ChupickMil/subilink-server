-- AlterTable
ALTER TABLE "chat" ADD COLUMN     "deleteFor" TEXT[];

-- AlterTable
ALTER TABLE "message" ADD COLUMN     "deleteFor" TEXT[];
