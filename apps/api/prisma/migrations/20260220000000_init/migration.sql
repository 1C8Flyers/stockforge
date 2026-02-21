CREATE TYPE "RoleName" AS ENUM ('Admin', 'Officer', 'Clerk', 'ReadOnly');
CREATE TYPE "ShareholderType" AS ENUM ('PERSON', 'ENTITY');
CREATE TYPE "ShareholderStatus" AS ENUM ('Active', 'Inactive', 'DeceasedOutstanding', 'DeceasedSurrendered');
CREATE TYPE "LotStatus" AS ENUM ('Active', 'TransferredOut', 'Surrendered', 'Disputed');
CREATE TYPE "TransferStatus" AS ENUM ('DRAFT', 'POSTED');
CREATE TYPE "ProxyStatus" AS ENUM ('Draft', 'Verified', 'Revoked');
CREATE TYPE "VoteRule" AS ENUM ('SIMPLE_MAJORITY');
CREATE TYPE "VoteResult" AS ENUM ('Passed', 'Failed');

CREATE TABLE "User" (
  "id" TEXT PRIMARY KEY,
  "email" TEXT NOT NULL UNIQUE,
  "passwordHash" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL
);

CREATE TABLE "Role" (
  "id" TEXT PRIMARY KEY,
  "name" "RoleName" NOT NULL UNIQUE
);

CREATE TABLE "UserRole" (
  "userId" TEXT NOT NULL,
  "roleId" TEXT NOT NULL,
  PRIMARY KEY ("userId", "roleId"),
  CONSTRAINT "UserRole_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "UserRole_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "Role"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE "AppConfig" (
  "id" TEXT PRIMARY KEY,
  "key" TEXT NOT NULL UNIQUE,
  "value" TEXT NOT NULL,
  "updatedById" TEXT,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "AppConfig_updatedById_fkey" FOREIGN KEY ("updatedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE TABLE "Shareholder" (
  "id" TEXT PRIMARY KEY,
  "type" "ShareholderType" NOT NULL,
  "firstName" TEXT,
  "lastName" TEXT,
  "entityName" TEXT,
  "email" TEXT,
  "phone" TEXT,
  "address1" TEXT,
  "address2" TEXT,
  "city" TEXT,
  "state" TEXT,
  "postalCode" TEXT,
  "status" "ShareholderStatus" NOT NULL DEFAULT 'Active',
  "notes" TEXT,
  "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL
);

CREATE TABLE "ShareLot" (
  "id" TEXT PRIMARY KEY,
  "ownerId" TEXT NOT NULL,
  "shares" INTEGER NOT NULL,
  "status" "LotStatus" NOT NULL DEFAULT 'Active',
  "certificateNumber" TEXT,
  "acquiredDate" TIMESTAMP(3),
  "source" TEXT,
  "notes" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ShareLot_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "Shareholder"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE INDEX "ShareLot_ownerId_idx" ON "ShareLot"("ownerId");

CREATE TABLE "Transfer" (
  "id" TEXT PRIMARY KEY,
  "fromOwnerId" TEXT,
  "toOwnerId" TEXT,
  "meetingId" TEXT,
  "status" "TransferStatus" NOT NULL DEFAULT 'DRAFT',
  "postedAt" TIMESTAMP(3),
  "notes" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Transfer_fromOwnerId_fkey" FOREIGN KEY ("fromOwnerId") REFERENCES "Shareholder"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT "Transfer_toOwnerId_fkey" FOREIGN KEY ("toOwnerId") REFERENCES "Shareholder"("id") ON DELETE SET NULL ON UPDATE CASCADE
);
CREATE INDEX "Transfer_status_idx" ON "Transfer"("status");

CREATE TABLE "TransferLine" (
  "id" TEXT PRIMARY KEY,
  "transferId" TEXT NOT NULL,
  "lotId" TEXT NOT NULL,
  "sharesTaken" INTEGER NOT NULL,
  CONSTRAINT "TransferLine_transferId_fkey" FOREIGN KEY ("transferId") REFERENCES "Transfer"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "TransferLine_lotId_fkey" FOREIGN KEY ("lotId") REFERENCES "ShareLot"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE TABLE "MeetingSnapshot" (
  "id" TEXT PRIMARY KEY,
  "activeVotingShares" INTEGER NOT NULL,
  "excludedShares" INTEGER NOT NULL,
  "majorityThreshold" INTEGER NOT NULL,
  "rulesJson" JSONB NOT NULL
);

CREATE TABLE "Meeting" (
  "id" TEXT PRIMARY KEY,
  "title" TEXT NOT NULL,
  "dateTime" TIMESTAMP(3) NOT NULL,
  "snapshotId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Meeting_snapshotId_fkey" FOREIGN KEY ("snapshotId") REFERENCES "MeetingSnapshot"("id") ON DELETE SET NULL ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "Meeting_snapshotId_key" ON "Meeting"("snapshotId");

CREATE TABLE "Attachment" (
  "id" TEXT PRIMARY KEY,
  "path" TEXT NOT NULL,
  "originalName" TEXT NOT NULL,
  "mimeType" TEXT NOT NULL,
  "size" INTEGER NOT NULL,
  "createdBy" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Attachment_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE TABLE "Proxy" (
  "id" TEXT PRIMARY KEY,
  "meetingId" TEXT NOT NULL,
  "grantorId" TEXT NOT NULL,
  "proxyHolderName" TEXT NOT NULL,
  "proxyHolderShareholderId" TEXT,
  "receivedDate" TIMESTAMP(3) NOT NULL,
  "status" "ProxyStatus" NOT NULL DEFAULT 'Draft',
  "proxySharesSnapshot" INTEGER NOT NULL,
  "attachmentId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Proxy_meetingId_fkey" FOREIGN KEY ("meetingId") REFERENCES "Meeting"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "Proxy_grantorId_fkey" FOREIGN KEY ("grantorId") REFERENCES "Shareholder"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "Proxy_proxyHolderShareholderId_fkey" FOREIGN KEY ("proxyHolderShareholderId") REFERENCES "Shareholder"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT "Proxy_attachmentId_fkey" FOREIGN KEY ("attachmentId") REFERENCES "Attachment"("id") ON DELETE SET NULL ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "Proxy_attachmentId_key" ON "Proxy"("attachmentId");

CREATE TABLE "Attendance" (
  "id" TEXT PRIMARY KEY,
  "meetingId" TEXT NOT NULL,
  "shareholderId" TEXT NOT NULL,
  "present" BOOLEAN NOT NULL DEFAULT false,
  CONSTRAINT "Attendance_meetingId_fkey" FOREIGN KEY ("meetingId") REFERENCES "Meeting"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "Attendance_shareholderId_fkey" FOREIGN KEY ("shareholderId") REFERENCES "Shareholder"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "Attendance_meetingId_shareholderId_key" ON "Attendance"("meetingId", "shareholderId");

CREATE TABLE "Motion" (
  "id" TEXT PRIMARY KEY,
  "meetingId" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "text" TEXT NOT NULL,
  "voteRule" "VoteRule" NOT NULL DEFAULT 'SIMPLE_MAJORITY',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Motion_meetingId_fkey" FOREIGN KEY ("meetingId") REFERENCES "Meeting"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE "Vote" (
  "id" TEXT PRIMARY KEY,
  "motionId" TEXT NOT NULL,
  "yesShares" INTEGER NOT NULL,
  "noShares" INTEGER NOT NULL,
  "abstainShares" INTEGER NOT NULL,
  "result" "VoteResult" NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Vote_motionId_fkey" FOREIGN KEY ("motionId") REFERENCES "Motion"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE "AuditLog" (
  "id" TEXT PRIMARY KEY,
  "userId" TEXT NOT NULL,
  "action" TEXT NOT NULL,
  "entityType" TEXT NOT NULL,
  "entityId" TEXT NOT NULL,
  "diffJson" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "AuditLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE INDEX "AuditLog_entityType_entityId_idx" ON "AuditLog"("entityType", "entityId");
