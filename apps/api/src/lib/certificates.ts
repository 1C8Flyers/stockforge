type ShareLotReader = {
  shareLot: {
    findMany(args: {
      select: { certificateNumber: true };
      where?: { certificateNumber?: { not: null }; tenantId?: string };
    }): Promise<Array<{ certificateNumber: string | null }>>;
  };
};

export async function nextAutoCertificateNumber(db: ShareLotReader, tenantId?: string): Promise<string> {
  const lots = await db.shareLot.findMany({
    select: { certificateNumber: true },
    where: {
      certificateNumber: { not: null },
      ...(tenantId ? { tenantId } : {})
    }
  });

  let maxNumeric = 999;
  for (const lot of lots) {
    const raw = lot.certificateNumber?.trim();
    if (!raw) continue;
    if (!/^\d+$/.test(raw)) continue;
    const n = Number(raw);
    if (Number.isFinite(n) && n > maxNumeric) maxNumeric = n;
  }

  return String(maxNumeric + 1);
}
