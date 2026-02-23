import { LotStatus, PrismaClient, ShareholderStatus } from '@prisma/client';
import { DEFAULT_TENANT_ID } from './tenant.js';

export async function getExcludeDisputed(prisma: PrismaClient, tenantId = DEFAULT_TENANT_ID) {
  const row = await prisma.appConfig.findUnique({
    where: {
      tenantId_key: {
        tenantId,
        key: 'excludeDisputedFromVoting'
      }
    }
  });
  return row?.value === 'true';
}

export async function calculateVotingSnapshot(prisma: PrismaClient, tenantId = DEFAULT_TENANT_ID) {
  const excludeDisputed = await getExcludeDisputed(prisma, tenantId);
  const lots = await prisma.shareLot.findMany({ where: { tenantId }, include: { owner: true } });

  let activeVotingShares = 0;
  let excludedByOwner = 0;
  let excludedBySurrendered = 0;
  let excludedByTreasury = 0;
  let excludedByDisputed = 0;

  for (const lot of lots) {
    const ownerExcluded =
      lot.owner.status === ShareholderStatus.Inactive ||
      lot.owner.status === ShareholderStatus.DeceasedOutstanding ||
      lot.owner.status === ShareholderStatus.DeceasedSurrendered;
    const surrenderedExcluded = lot.status === LotStatus.Surrendered;
    const treasuryExcluded = lot.status === LotStatus.Treasury;
    const disputedExcluded = excludeDisputed && lot.status === LotStatus.Disputed;

    if (ownerExcluded) excludedByOwner += lot.shares;
    else if (surrenderedExcluded) excludedBySurrendered += lot.shares;
    else if (treasuryExcluded) excludedByTreasury += lot.shares;
    else if (disputedExcluded) excludedByDisputed += lot.shares;
    else if (lot.status === LotStatus.Active || lot.status === LotStatus.Disputed) activeVotingShares += lot.shares;
  }

  const excludedShares = excludedByOwner + excludedBySurrendered + excludedByTreasury + excludedByDisputed;
  return {
    activeVotingShares,
    excludedShares,
    majorityThreshold: Math.floor(activeVotingShares / 2) + 1,
    breakdown: { excludedByOwner, excludedBySurrendered, excludedByTreasury, excludedByDisputed },
    rulesJson: { excludeDisputedFromVoting: excludeDisputed }
  };
}

export async function getShareholderActiveShares(prisma: PrismaClient, shareholderId: string, tenantId = DEFAULT_TENANT_ID) {
  const excludeDisputed = await getExcludeDisputed(prisma, tenantId);
  const shareholder = await prisma.shareholder.findFirst({
    where: { id: shareholderId, tenantId },
    select: { status: true }
  });
  if (!shareholder) return 0;
  const ownerExcluded =
    shareholder.status === ShareholderStatus.Inactive ||
    shareholder.status === ShareholderStatus.DeceasedOutstanding ||
    shareholder.status === ShareholderStatus.DeceasedSurrendered;
  if (ownerExcluded) return 0;

  const lots = await prisma.shareLot.findMany({ where: { ownerId: shareholderId, tenantId } });
  return lots
    .filter((lot) => lot.status === LotStatus.Active || (!excludeDisputed && lot.status === LotStatus.Disputed))
    .reduce((sum, lot) => sum + lot.shares, 0);
}
