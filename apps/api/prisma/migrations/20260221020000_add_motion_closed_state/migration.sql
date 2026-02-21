-- Add persistent closed/open state for motions
ALTER TABLE "Motion"
ADD COLUMN "isClosed" BOOLEAN NOT NULL DEFAULT false;
