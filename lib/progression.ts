const TIER_BASE: Record<string, number> = {
  IRON: 0,
  BRONZE: 1_000,
  SILVER: 2_000,
  GOLD: 3_000,
  PLATINUM: 4_000,
  EMERALD: 5_000,
  DIAMOND: 6_000,
  MASTER: 7_000,
  GRANDMASTER: 8_000,
  CHALLENGER: 9_000,
};

const DIVISION_OFFSET: Record<string, number> = {
  IV: 0,
  III: 100,
  II: 200,
  I: 300,
};

/**
 * Produces a display-only score so rank movement across tiers/divisions can
 * be plotted on one axis. It is not Riot LP and is not used for leaderboard ranking.
 */
export function toProgressionScore(tier: string, division: string | null, lp: number) {
  const base = TIER_BASE[tier] ?? 0;
  const divisionOffset = base < TIER_BASE.MASTER ? (DIVISION_OFFSET[division ?? "IV"] ?? 0) : 0;
  return base + divisionOffset + lp;
}
