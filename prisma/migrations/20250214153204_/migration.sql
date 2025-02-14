-- CreateTable
CREATE TABLE "visit" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "session_id" TEXT NOT NULL,
    "ip_address" TEXT NOT NULL,
    "user_agent" TEXT NOT NULL,

    CONSTRAINT "visit_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "visit_id_key" ON "visit"("id");

-- AddForeignKey
ALTER TABLE "visit" ADD CONSTRAINT "visit_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
