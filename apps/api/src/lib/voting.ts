import { LotStatus, PrismaClient, ShareholderStatus } from '@prisma/client';

export async function getExcludeDisputed(prisma: PrismaClient) {
  const row = await prisma.appConfig.findUnique({ where: { key: 'excludeDisputedFromVoting' } });
  return row?.value === 'true';
}

export async function calculateVotingSnapshot(prisma: PrismaClient) {
  const excludeDisputed = await getExcludeDisputed(prisma);
  const lots = await prisma.shareLot.findMany({ include: { owner: true } });

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

export async function getShareholderActiveShares(prisma: PrismaClient, shareholderId: string) {
  const excludeDisputed = await getExcludeDisputed(prisma);
  const shareholder = await prisma.shareholder.findUnique({ where: { id: shareholderId }, select: { status: true } });
  if (!shareholder) return 0;
  const ownerExcluded =
    shareholder.status === ShareholderStatus.Inactive ||
    shareholder.status === ShareholderStatus.DeceasedOutstanding ||
    shareholder.status === ShareholderStatus.DeceasedSurrendered;
  if (ownerExcluded) return 0;

  const lots = await prisma.shareLot.findMany({ where: { ownerId: shareholderId } });
  return lots
    .filter((lot) => lot.status === LotStatus.Active || (!excludeDisputed && lot.status === LotStatus.Disputed))
    .reduce((sum, lot) => sum + lot.shares, 0);
}
