-- CreateEnum
CREATE TYPE "MotionType" AS ENUM ('STANDARD', 'ELECTION');

-- AlterTable
ALTER TABLE "Motion"
ADD COLUMN "type" "MotionType" NOT NULL DEFAULT 'STANDARD',
ADD COLUMN "officeTitle" TEXT,
ADD COLUMN "candidatesJson" JSONB;

-- AlterTable
ALTER TABLE "Vote"
ADD COLUMN "detailsJson" JSONB;