-- CreateEnum
CREATE TYPE "NotificationChannel" AS ENUM ('EMAIL', 'SMS', 'SMS_VOICE');

-- CreateEnum
CREATE TYPE "CertAlertStatus" AS ENUM ('PENDING', 'SENT', 'ACKNOWLEDGED');

-- AlterEnum
ALTER TYPE "VerificationCodeType" ADD VALUE 'SMS';

-- AlterTable
ALTER TABLE "Certificate" ADD COLUMN     "autoRenew" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "renewalNotifiedAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "Organization" ADD COLUMN     "emailFromName" TEXT,
ADD COLUMN     "primaryColor" TEXT DEFAULT '#dc2626',
ADD COLUMN     "webhookUrl" TEXT;

-- AlterTable
ALTER TABLE "Signature" ADD COLUMN     "lastReminderAt" TIMESTAMP(3),
ADD COLUMN     "notificationChannel" "NotificationChannel" NOT NULL DEFAULT 'EMAIL',
ADD COLUMN     "verificationSentAt" TIMESTAMP(3),
ADD COLUMN     "viewedAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "SigningRequest" ADD COLUMN     "brandColor" TEXT DEFAULT '#dc2626',
ADD COLUMN     "cancelledAt" TIMESTAMP(3),
ADD COLUMN     "companyLogo" TEXT,
ADD COLUMN     "companyName" TEXT,
ADD COLUMN     "completedAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "SigningTemplate" ADD COLUMN     "category" TEXT,
ADD COLUMN     "pdfBaseUrl" TEXT,
ADD COLUMN     "previewImageUrl" TEXT,
ADD COLUMN     "signerRoles" JSONB,
ADD COLUMN     "usageCount" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "phone" TEXT,
ADD COLUMN     "preferredNotificationChannel" "NotificationChannel" NOT NULL DEFAULT 'EMAIL';

-- CreateTable
CREATE TABLE "CertificateRenewalAlert" (
    "id" TEXT NOT NULL,
    "daysBeforeExpiry" INTEGER NOT NULL,
    "status" "CertAlertStatus" NOT NULL DEFAULT 'PENDING',
    "sentAt" TIMESTAMP(3),
    "acknowledgedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "certificateId" TEXT NOT NULL,

    CONSTRAINT "CertificateRenewalAlert_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CertificateRenewalAlert_status_idx" ON "CertificateRenewalAlert"("status");

-- CreateIndex
CREATE INDEX "CertificateRenewalAlert_certificateId_idx" ON "CertificateRenewalAlert"("certificateId");

-- CreateIndex
CREATE UNIQUE INDEX "CertificateRenewalAlert_certificateId_daysBeforeExpiry_key" ON "CertificateRenewalAlert"("certificateId", "daysBeforeExpiry");

-- CreateIndex
CREATE INDEX "Certificate_validTo_idx" ON "Certificate"("validTo");

-- CreateIndex
CREATE INDEX "SigningRequest_companyName_idx" ON "SigningRequest"("companyName");

-- CreateIndex
CREATE INDEX "SigningTemplate_category_idx" ON "SigningTemplate"("category");

-- AddForeignKey
ALTER TABLE "CertificateRenewalAlert" ADD CONSTRAINT "CertificateRenewalAlert_certificateId_fkey" FOREIGN KEY ("certificateId") REFERENCES "Certificate"("id") ON DELETE CASCADE ON UPDATE CASCADE;
