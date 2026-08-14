-- CreateEnum
CREATE TYPE "PaymentMethod" AS ENUM ('PIX', 'CARD');

-- CreateEnum
CREATE TYPE "PaymentChargeStatus" AS ENUM ('PENDENTE', 'PAGO', 'EXPIRADO', 'CANCELADO');

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "infinitePayHandlePF" TEXT,
ADD COLUMN     "infinitePayHandlePJ" TEXT;

-- CreateTable
CREATE TABLE "payment_charges" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "transactionId" TEXT NOT NULL,
    "method" "PaymentMethod" NOT NULL,
    "status" "PaymentChargeStatus" NOT NULL DEFAULT 'PENDENTE',
    "amount" DECIMAL(14,2) NOT NULL,
    "handle" TEXT NOT NULL,
    "externalId" TEXT,
    "paymentUrl" TEXT,
    "qrCodeUrl" TEXT,
    "paidAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "payment_charges_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "payment_charges_userId_idx" ON "payment_charges"("userId");

-- CreateIndex
CREATE INDEX "payment_charges_transactionId_idx" ON "payment_charges"("transactionId");

-- CreateIndex
CREATE INDEX "payment_charges_externalId_idx" ON "payment_charges"("externalId");

-- AddForeignKey
ALTER TABLE "payment_charges" ADD CONSTRAINT "payment_charges_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
