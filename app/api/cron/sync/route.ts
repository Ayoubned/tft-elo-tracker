import { NextRequest, NextResponse } from "next/server";
import { getSupabase } from "@/lib/supabase";
import { getTftRank, getSummonerProfileIconId } from "@/lib/riot";

export const maxDuration = 60;

export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const supabase = getSupabase();
  const { data: competition, error: competitionError } = await supabase
    .from("competitions").select("id").eq("active", true).maybeSingle();
  if (competitionError) return NextResponse.json({ error: "Could not load competition." }, { status: 500 });
  if (!competition) return NextResponse.json({ message: "No active competition." });

  const { data: members, error: membersError } = await supabase
    .from("competition_players")
    .select("player_id, players!inner(id,puuid,active)")
    .eq("competition_id", competition.id)
    .eq("players.active", true);
  if (membersError) return NextResponse.json({ error: "Could not load players." }, { status: 500 });

  let synced = 0;
  let unchangedOrUnranked = 0;
  const failures: string[] = [];
  for (const member of members ?? []) {
    const player = Array.isArray(member.players) ? member.players[0] : member.players;
    if (!player) continue;
    try {
        try {
          const profileIconId = await getSummonerProfileIconId(player.puuid);
          if (profileIconId != null) {
            const { error: iconError } = await supabase.from("players")
              .update({ profile_icon_id: profileIconId }).eq("id", player.id);
            if (iconError) throw iconError;
          }
        } catch (iconError) {
          console.warn(`Could not refresh profile icon for player ${player.id}:`, iconError);
        }
        const rank = await getTftRank(player.puuid);
      if (!rank) { unchangedOrUnranked++; continue; }
      const { data: latest, error: latestError } = await supabase.from("rank_snapshots")
        .select("tier,division,league_points,wins,losses")
        .eq("player_id", player.id).eq("competition_id", competition.id)
        .order("fetched_at", { ascending: false }).limit(1).maybeSingle();
      if (latestError) throw latestError;
      const changed = !latest || latest.tier !== rank.tier || latest.division !== rank.rank ||
        latest.league_points !== rank.leaguePoints || latest.wins !== rank.wins || latest.losses !== rank.losses;
      if (changed) {
        const { error: insertError } = await supabase.from("rank_snapshots").insert({
          player_id: player.id, competition_id: competition.id,
          tier: rank.tier, division: rank.rank, league_points: rank.leaguePoints,
          wins: rank.wins, losses: rank.losses,
        });
        if (insertError) throw insertError;
      } else {
        unchangedOrUnranked++;
      }
      synced++;
    } catch (error) {
      console.error(`Sync failed for player ${player.id}:`, error);
      failures.push(player.id);
      const status = (error as { status?: number }).status;
      if (status === 429) break;
    }
  }
  return NextResponse.json({ synced, unchangedOrUnranked, failed: failures.length, failures });
}
