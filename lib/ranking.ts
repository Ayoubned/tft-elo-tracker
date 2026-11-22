const TIER_ORDER: Record<string, number> = {
  IRON: 0,
  BRONZE: 1,
  SILVER: 2,
  GOLD: 3,
  PLATINUM: 4,
  EMERALD: 5,
  DIAMOND: 6,
  MASTER: 7,
  GRANDMASTER: 8,
  CHALLENGER: 9,
};

const DIVISION_ORDER: Record<string, number> = {
  I: 0,
  II: 1,
  III: 2,
  IV: 3,
};

export type RankablePlayer = {
  tier: string | null;
  division: string | null;
  league_points: number | null;
};

/**
 * Ranked players sort above unranked players.
 * Higher tier, better division, then higher LP wins.
 * Two unranked players are tied.
 */
export function compareRanks(a: RankablePlayer, b: RankablePlayer): number {
  const aRanked = a.tier !== null && TIER_ORDER[a.tier] !== undefined;
  const bRanked = b.tier !== null && TIER_ORDER[b.tier] !== undefined;

  if (aRanked !== bRanked) return aRanked ? -1 : 1;
  if (!aRanked && !bRanked) return 0;

  const aTier = TIER_ORDER[a.tier!];
  const bTier = TIER_ORDER[b.tier!];

  if (aTier !== bTier) return bTier - aTier;

  // Divisions only apply through Diamond. Master+ uses LP directly.
  if (aTier < TIER_ORDER.MASTER) {
    const aDivision = DIVISION_ORDER[a.division ?? "I"] ?? 0;
    const bDivision = DIVISION_ORDER[b.division ?? "I"] ?? 0;
    if (aDivision !== bDivision) return aDivision - bDivision;
  }

  return (b.league_points ?? 0) - (a.league_points ?? 0);
}

export function formatRank(tier: string | null, division: string | null): string {
  if (!tier || TIER_ORDER[tier] === undefined) return "Unranked";

  const name = tier.charAt(0) + tier.slice(1).toLowerCase();
  const usesDivision = TIER_ORDER[tier] < TIER_ORDER.MASTER;

  return usesDivision && division ? `${name} ${division}` : name;
}
