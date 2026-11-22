const TIER_ORDER: Record<string, number> = {
  IRON: 0, BRONZE: 1, SILVER: 2, GOLD: 3, PLATINUM: 4,
  EMERALD: 5, DIAMOND: 6, MASTER: 7, GRANDMASTER: 8, CHALLENGER: 9,
};
const DIVISION_ORDER: Record<string, number> = { I: 0, II: 1, III: 2, IV: 3 };

export function compareRanks(a: { tier: string; division: string | null; league_points: number }, b: { tier: string; division: string | null; league_points: number }) {
  const tierDiff = (TIER_ORDER[b.tier] ?? -1) - (TIER_ORDER[a.tier] ?? -1);
  if (tierDiff) return tierDiff;
  const aDivision = DIVISION_ORDER[a.division ?? "I"] ?? 0;
  const bDivision = DIVISION_ORDER[b.division ?? "I"] ?? 0;
  if (aDivision !== bDivision && (TIER_ORDER[a.tier] ?? 0) < TIER_ORDER.MASTER) return aDivision - bDivision;
  return b.league_points - a.league_points;
}

export function formatRank(tier: string, division: string | null) {
  return [(tier ?? "UNRANKED").charAt(0) + tier.slice(1).toLowerCase(), division && TIER_ORDER[tier] < TIER_ORDER.MASTER ? division : null]
    .filter(Boolean).join(" ");
}
