-- CreateTable
CREATE TABLE "ContactRequest" (
    "id" TEXT NOT NULL,
    "companyName" TEXT NOT NULL,
    "contactName" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT,
    "position" TEXT,
    "employees" TEXT NOT NULL,
    "industry" TEXT NOT NULL,
    "documentsPerMonth" TEXT NOT NULL,
    "needsCertificateAuthority" BOOLEAN NOT NULL DEFAULT false,
    "needsApiIntegration" BOOLEAN NOT NULL DEFAULT false,
    "needsWhiteLabel" BOOLEAN NOT NULL DEFAULT false,
    "needsCustomTemplates" BOOLEAN NOT NULL DEFAULT false,
    "currentSolution" TEXT,
    "message" TEXT,
    "status" TEXT NOT NULL DEFAULT 'NEW',
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ContactRequest_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ContactRequest_status_idx" ON "ContactRequest"("status");

-- CreateIndex
CREATE INDEX "ContactRequest_createdAt_idx" ON "ContactRequest"("createdAt");

-- CreateIndex
CREATE INDEX "ContactRequest_email_idx" ON "ContactRequest"("email");
