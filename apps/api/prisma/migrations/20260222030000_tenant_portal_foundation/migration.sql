-- Enums for portal models
CREATE TYPE "ProxyAuthorizationType" AS ENUM ('MEETING', 'STANDING');
CREATE TYPE "ProxyAuthorizationScope" AS ENUM ('GENERAL', 'DIRECTED');
CREATE TYPE "ProxyAuthorizationStatus" AS ENUM ('PENDING', 'ACCEPTED', 'REJECTED', 'REVOKED');
CREATE TYPE "BeneficiaryDesignationStatus" AS ENUM ('DRAFT', 'SUBMITTED', 'ACKNOWLEDGED');

-- Tenant core
CREATE TABLE "Tenant" (
  "id" TEXT NOT NULL,
  "slug" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Tenant_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Tenant_slug_key" ON "Tenant"("slug");

INSERT INTO "Tenant" ("id", "slug", "name")
VALUES ('default', 'default', 'Default')
ON CONFLICT ("id") DO NOTHING;

CREATE TABLE "TenantUser" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "roles" "RoleName"[] DEFAULT ARRAY[]::"RoleName"[],
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "TenantUser_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "TenantUser_tenantId_userId_key" ON "TenantUser"("tenantId", "userId");
CREATE INDEX "TenantUser_userId_idx" ON "TenantUser"("userId");

-- Add tenantId to existing tenant-owned tables
ALTER TABLE "AppConfig" ADD COLUMN "tenantId" TEXT NOT NULL DEFAULT 'default';
ALTER TABLE "EmailSettings" ADD COLUMN "tenantId" TEXT NOT NULL DEFAULT 'default';
ALTER TABLE "Shareholder" ADD COLUMN "tenantId" TEXT NOT NULL DEFAULT 'default';
ALTER TABLE "ShareLot" ADD COLUMN "tenantId" TEXT NOT NULL DEFAULT 'default';
ALTER TABLE "Transfer" ADD COLUMN "tenantId" TEXT NOT NULL DEFAULT 'default';
ALTER TABLE "TransferLine" ADD COLUMN "tenantId" TEXT NOT NULL DEFAULT 'default';
ALTER TABLE "Meeting" ADD COLUMN "tenantId" TEXT NOT NULL DEFAULT 'default';
ALTER TABLE "MeetingSnapshot" ADD COLUMN "tenantId" TEXT NOT NULL DEFAULT 'default';
ALTER TABLE "Proxy" ADD COLUMN "tenantId" TEXT NOT NULL DEFAULT 'default';
ALTER TABLE "Attendance" ADD COLUMN "tenantId" TEXT NOT NULL DEFAULT 'default';
ALTER TABLE "Motion" ADD COLUMN "tenantId" TEXT NOT NULL DEFAULT 'default';
ALTER TABLE "Vote" ADD COLUMN "tenantId" TEXT NOT NULL DEFAULT 'default';
ALTER TABLE "Attachment" ADD COLUMN "tenantId" TEXT NOT NULL DEFAULT 'default';
ALTER TABLE "AuditLog" ADD COLUMN "tenantId" TEXT NOT NULL DEFAULT 'default';
ALTER TABLE "PasswordResetToken" ADD COLUMN "tenantId" TEXT NOT NULL DEFAULT 'default';
ALTER TABLE "EmailLog" ADD COLUMN "tenantId" TEXT NOT NULL DEFAULT 'default';

-- AppConfig uniqueness must be tenant-scoped
ALTER TABLE "AppConfig" DROP CONSTRAINT IF EXISTS "AppConfig_key_key";
CREATE UNIQUE INDEX "AppConfig_tenantId_key_key" ON "AppConfig"("tenantId", "key");

-- Attendance uniqueness must be tenant-scoped
CREATE UNIQUE INDEX "Attendance_tenantId_meetingId_shareholderId_key" ON "Attendance"("tenantId", "meetingId", "shareholderId");
CREATE INDEX "Attendance_meetingId_shareholderId_idx" ON "Attendance"("meetingId", "shareholderId");

-- New tenant-aware helper indexes
CREATE UNIQUE INDEX "EmailSettings_tenantId_key" ON "EmailSettings"("tenantId");
CREATE INDEX "AppConfig_tenantId_idx" ON "AppConfig"("tenantId");
CREATE INDEX "Shareholder_tenantId_idx" ON "Shareholder"("tenantId");
CREATE INDEX "ShareLot_tenantId_idx" ON "ShareLot"("tenantId");
CREATE INDEX "Transfer_tenantId_idx" ON "Transfer"("tenantId");
CREATE INDEX "TransferLine_tenantId_idx" ON "TransferLine"("tenantId");
CREATE INDEX "Meeting_tenantId_idx" ON "Meeting"("tenantId");
CREATE INDEX "MeetingSnapshot_tenantId_idx" ON "MeetingSnapshot"("tenantId");
CREATE INDEX "Proxy_tenantId_idx" ON "Proxy"("tenantId");
CREATE INDEX "Motion_tenantId_idx" ON "Motion"("tenantId");
CREATE INDEX "Vote_tenantId_idx" ON "Vote"("tenantId");
CREATE INDEX "Attachment_tenantId_idx" ON "Attachment"("tenantId");
CREATE INDEX "AuditLog_tenantId_idx" ON "AuditLog"("tenantId");
CREATE INDEX "PasswordResetToken_tenantId_idx" ON "PasswordResetToken"("tenantId");
CREATE INDEX "EmailLog_tenantId_idx" ON "EmailLog"("tenantId");

-- Shareholder link mapping
CREATE TABLE "ShareholderLink" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "shareholderId" TEXT NOT NULL,
  "verifiedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ShareholderLink_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ShareholderLink_tenantId_userId_key" ON "ShareholderLink"("tenantId", "userId");
CREATE UNIQUE INDEX "ShareholderLink_tenantId_shareholderId_key" ON "ShareholderLink"("tenantId", "shareholderId");

-- New proxy authorization model
CREATE TABLE "ProxyAuthorization" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "shareholderId" TEXT NOT NULL,
  "proxyType" "ProxyAuthorizationType" NOT NULL,
  "meetingId" TEXT,
  "proxyHolderShareholderId" TEXT,
  "proxyHolderName" TEXT,
  "proxyHolderEmail" TEXT,
  "proxyHolderAddress" TEXT,
  "scope" "ProxyAuthorizationScope" NOT NULL DEFAULT 'GENERAL',
  "effectiveAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "expiresAt" TIMESTAMP(3),
  "status" "ProxyAuthorizationStatus" NOT NULL DEFAULT 'PENDING',
  "signedAt" TIMESTAMP(3),
  "signatureHash" TEXT,
  "ip" TEXT,
  "userAgent" TEXT,
  "createdByUserId" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ProxyAuthorization_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "ProxyAuthorization_tenantId_shareholderId_idx" ON "ProxyAuthorization"("tenantId", "shareholderId");
CREATE INDEX "ProxyAuthorization_tenantId_meetingId_idx" ON "ProxyAuthorization"("tenantId", "meetingId");
CREATE INDEX "ProxyAuthorization_tenantId_status_idx" ON "ProxyAuthorization"("tenantId", "status");

-- Beneficiary designation models
CREATE TABLE "BeneficiaryDesignation" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "shareholderId" TEXT NOT NULL,
  "status" "BeneficiaryDesignationStatus" NOT NULL DEFAULT 'DRAFT',
  "createdByUserId" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "BeneficiaryDesignation_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "BeneficiaryDesignation_tenantId_shareholderId_idx" ON "BeneficiaryDesignation"("tenantId", "shareholderId");
CREATE INDEX "BeneficiaryDesignation_tenantId_status_idx" ON "BeneficiaryDesignation"("tenantId", "status");

CREATE TABLE "BeneficiaryDesignationEntry" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "designationId" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "relationship" TEXT,
  "email" TEXT,
  "phone" TEXT,
  "address" TEXT,
  "percent" INTEGER NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "BeneficiaryDesignationEntry_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "BeneficiaryDesignationEntry_tenantId_designationId_idx" ON "BeneficiaryDesignationEntry"("tenantId", "designationId");

-- Foreign keys to tenant
ALTER TABLE "TenantUser" ADD CONSTRAINT "TenantUser_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "TenantUser" ADD CONSTRAINT "TenantUser_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "AppConfig" ADD CONSTRAINT "AppConfig_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "EmailSettings" ADD CONSTRAINT "EmailSettings_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Shareholder" ADD CONSTRAINT "Shareholder_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ShareLot" ADD CONSTRAINT "ShareLot_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Transfer" ADD CONSTRAINT "Transfer_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "TransferLine" ADD CONSTRAINT "TransferLine_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Meeting" ADD CONSTRAINT "Meeting_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "MeetingSnapshot" ADD CONSTRAINT "MeetingSnapshot_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Proxy" ADD CONSTRAINT "Proxy_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Attendance" ADD CONSTRAINT "Attendance_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Motion" ADD CONSTRAINT "Motion_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Vote" ADD CONSTRAINT "Vote_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Attachment" ADD CONSTRAINT "Attachment_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "PasswordResetToken" ADD CONSTRAINT "PasswordResetToken_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "EmailLog" ADD CONSTRAINT "EmailLog_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "ShareholderLink" ADD CONSTRAINT "ShareholderLink_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ShareholderLink" ADD CONSTRAINT "ShareholderLink_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ShareholderLink" ADD CONSTRAINT "ShareholderLink_shareholderId_fkey" FOREIGN KEY ("shareholderId") REFERENCES "Shareholder"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ProxyAuthorization" ADD CONSTRAINT "ProxyAuthorization_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ProxyAuthorization" ADD CONSTRAINT "ProxyAuthorization_shareholderId_fkey" FOREIGN KEY ("shareholderId") REFERENCES "Shareholder"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ProxyAuthorization" ADD CONSTRAINT "ProxyAuthorization_meetingId_fkey" FOREIGN KEY ("meetingId") REFERENCES "Meeting"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ProxyAuthorization" ADD CONSTRAINT "ProxyAuthorization_proxyHolderShareholderId_fkey" FOREIGN KEY ("proxyHolderShareholderId") REFERENCES "Shareholder"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ProxyAuthorization" ADD CONSTRAINT "ProxyAuthorization_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "BeneficiaryDesignation" ADD CONSTRAINT "BeneficiaryDesignation_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "BeneficiaryDesignation" ADD CONSTRAINT "BeneficiaryDesignation_shareholderId_fkey" FOREIGN KEY ("shareholderId") REFERENCES "Shareholder"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "BeneficiaryDesignation" ADD CONSTRAINT "BeneficiaryDesignation_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "BeneficiaryDesignationEntry" ADD CONSTRAINT "BeneficiaryDesignationEntry_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "BeneficiaryDesignationEntry" ADD CONSTRAINT "BeneficiaryDesignationEntry_designationId_fkey" FOREIGN KEY ("designationId") REFERENCES "BeneficiaryDesignation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Backfill tenant membership for existing admins
INSERT INTO "TenantUser" ("id", "tenantId", "userId", "roles", "createdAt")
SELECT
  CONCAT('tu_', u."id"),
  'default',
  u."id",
  ARRAY['Admin']::"RoleName"[],
  CURRENT_TIMESTAMP
FROM "User" u
WHERE EXISTS (
  SELECT 1
  FROM "UserRole" ur
  JOIN "Role" r ON r."id" = ur."roleId"
  WHERE ur."userId" = u."id" AND r."name" = 'Admin'
)
ON CONFLICT ("tenantId", "userId") DO NOTHING;
