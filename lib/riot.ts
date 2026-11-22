const API_KEY = process.env.RIOT_API_KEY;
const PLATFORM = process.env.RIOT_PLATFORM_ROUTING || "euw1";
const REGIONAL = process.env.RIOT_REGIONAL_ROUTING || "europe";

async function riotFetch<T>(url: string): Promise<T> {
  if (!API_KEY) throw new Error("RIOT_API_KEY is not configured.");
  const response = await fetch(url, {
    headers: { "X-Riot-Token": API_KEY },
    cache: "no-store",
  });
  if (!response.ok) {
    const error = new Error(`Riot API returned ${response.status}.`);
    Object.assign(error, { status: response.status, retryAfter: response.headers.get("Retry-After") });
    throw error;
  }
  return response.json() as Promise<T>;
}

export type RiotAccount = { puuid: string; gameName: string; tagLine: string };
export type RiotLeagueEntry = {
  puuid: string;
  queueType: string;
  tier: string;
  rank: string;
  leaguePoints: number;
  wins: number;
  losses: number;
};

export async function getAccount(gameName: string, tagLine: string) {
  const path = `/riot/account/v1/accounts/by-riot-id/${encodeURIComponent(gameName)}/${encodeURIComponent(tagLine)}`;
  return riotFetch<RiotAccount>(`https://${REGIONAL}.api.riotgames.com${path}`);
}

export async function getTftRank(puuid: string) {
  const path = `/tft/league/v1/by-puuid/${encodeURIComponent(puuid)}`;
  const entries = await riotFetch<RiotLeagueEntry[]>(`https://${PLATFORM}.api.riotgames.com${path}`);
  return entries.find((entry) => entry.queueType === "RANKED_TFT") ?? null;
}
