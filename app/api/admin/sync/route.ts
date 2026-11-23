import { NextRequest, NextResponse } from "next/server";
import { timingSafeEqual } from "node:crypto";
import { getSupabase } from "@/lib/supabase";
import { getTftRank, getSummonerProfileIconId } from "@/lib/riot";

export const maxDuration = 60;

function isAuthorized(request: NextRequest) {
  const expected = process.env.ADMIN_SECRET;
  const supplied = request.headers.get("x-admin-secret");
  if (!expected || !supplied) return false;

  const expectedBuffer = Buffer.from(expected);
  const suppliedBuffer = Buffer.from(supplied);
  return expectedBuffer.length === suppliedBuffer.length &&
    timingSafeEqual(expectedBuffer, suppliedBuffer);
}

export async function POST(request: NextRequest) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized. Enter the correct admin secret." }, { status: 401 });
  }

  try {
    const supabase = getSupabase();
    const { data: competition, error: competitionError } = await supabase
      .from("competitions")
      .select("id")
      .eq("active", true)
      .maybeSingle();

    if (competitionError) throw competitionError;
    if (!competition) {
      return NextResponse.json({ error: "No active competition." }, { status: 409 });
    }

    const { data: members, error: membersError } = await supabase
      .from("competition_players")
      .select("player_id, players!inner(id,puuid,active)")
      .eq("competition_id", competition.id)
      .eq("players.active", true);

    if (membersError) throw membersError;

    let updated = 0;
    let unchanged = 0;
    let unranked = 0;
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
        if (!rank) {
          unranked++;
          continue;
        }

        const { data: latest, error: latestError } = await supabase
          .from("rank_snapshots")
          .select("tier,division,league_points,wins,losses")
          .eq("player_id", player.id)
          .eq("competition_id", competition.id)
          .order("fetched_at", { ascending: false })
          .limit(1)
          .maybeSingle();

        if (latestError) throw latestError;

        const changed = !latest ||
          latest.tier !== rank.tier ||
          latest.division !== rank.rank ||
          latest.league_points !== rank.leaguePoints ||
          latest.wins !== rank.wins ||
          latest.losses !== rank.losses;

        if (!changed) {
          unchanged++;
          continue;
        }

        const { error: insertError } = await supabase.from("rank_snapshots").insert({
          player_id: player.id,
          competition_id: competition.id,
          tier: rank.tier,
          division: rank.rank,
          league_points: rank.leaguePoints,
          wins: rank.wins,
          losses: rank.losses,
        });

        if (insertError) throw insertError;
        updated++;
      } catch (error) {
        console.error(`Manual sync failed for player ${player.id}:`, error);
        failures.push(player.id);
        if ((error as { status?: number }).status === 429) break;
      }
    }

    return NextResponse.json({
      updated,
      unchanged,
      unranked,
      failed: failures.length,
      failures,
      total: members?.length ?? 0,
    });
  } catch (error) {
    console.error("Manual sync error:", error);
    return NextResponse.json({ error: "Synchronization failed. Check the server logs." }, { status: 500 });
  }
}
