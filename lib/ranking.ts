const TIER_ORDER: Record<string, number> = {
  IRON: 0, BRONZE: 1, SILVER: 2, GOLD: 3, PLATINUM: 4,
  EMERALD: 5, DIAMOND: 6, MASTER: 7, GRANDMASTER: 8, CHALLENGER: 9,
};
const DIVISION_ORDER: Record<string, number> = { I: 0, II: 1, III: 2, IV: 3 };

type RankLike = { tier: string | null; division: string | null; league_points: number | null };

export function compareRanks(a: RankLike, b: RankLike) {
  if (!a.tier && b.tier) return 1;
  if (a.tier && !b.tier) return -1;
  if (!a.tier && !b.tier) return 0;

  const aTier = TIER_ORDER[a.tier!] ?? -1;
  const bTier = TIER_ORDER[b.tier!] ?? -1;
  const tierDiff = bTier - aTier;
  if (tierDiff) return tierDiff;

  const aDivision = DIVISION_ORDER[a.division ?? "I"] ?? 0;
  const bDivision = DIVISION_ORDER[b.division ?? "I"] ?? 0;
  if (aDivision !== bDivision && aTier < TIER_ORDER.MASTER) return aDivision - bDivision;
  return (b.league_points ?? 0) - (a.league_points ?? 0);
}

export function formatRank(tier: string | null, division: string | null) {
  if (!tier) return "Unranked";
  const name = tier.charAt(0) + tier.slice(1).toLowerCase();
  return division && TIER_ORDER[tier] < TIER_ORDER.MASTER ? `${name} ${division}` : name;
}
