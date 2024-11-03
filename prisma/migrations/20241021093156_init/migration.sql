-- CreateTable
CREATE TABLE "users" (
    "id" SERIAL NOT NULL,
    "phone" TEXT NOT NULL,
    "email" TEXT,
    "password" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "update_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "twofa" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "email" TEXT,
    "oauth" TEXT,
    "autentificator_code" TEXT,

    CONSTRAINT "twofa_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_id_key" ON "users"("id");

-- CreateIndex
CREATE UNIQUE INDEX "users_phone_key" ON "users"("phone");

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "twofa_id_key" ON "twofa"("id");

-- CreateIndex
CREATE UNIQUE INDEX "twofa_user_id_key" ON "twofa"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "twofa_email_key" ON "twofa"("email");

-- CreateIndex
CREATE UNIQUE INDEX "twofa_oauth_key" ON "twofa"("oauth");
