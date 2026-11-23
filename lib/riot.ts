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


export type RiotSummoner = { puuid: string; profileIconId: number };

export async function getSummonerProfileIconId(puuid: string): Promise<number | null> {
  const path = `/lol/summoner/v4/summoners/by-puuid/${encodeURIComponent(puuid)}`;
  const summoner = await riotFetch<RiotSummoner>(`https://${PLATFORM}.api.riotgames.com${path}`);
  return Number.isInteger(summoner.profileIconId) ? summoner.profileIconId : null;
}

export async function getProfileIconUrl(profileIconId: number | null): Promise<string | null> {
  if (profileIconId == null || !Number.isInteger(profileIconId) || profileIconId < 0) return null;
  try {
    const response = await fetch("https://ddragon.leagueoflegends.com/api/versions.json", {
      next: { revalidate: 86400 },
    });
    if (!response.ok) return null;
    const versions = await response.json() as string[];
    const version = versions?.[0];
    if (!version) return null;
    return `https://ddragon.leagueoflegends.com/cdn/${version}/img/profileicon/${profileIconId}.png`;
  } catch {
    return null;
  }
}
