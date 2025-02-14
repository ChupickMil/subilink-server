/*
  Warnings:

  - A unique constraint covering the columns `[session_id]` on the table `visit` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "visit_session_id_key" ON "visit"("session_id");
