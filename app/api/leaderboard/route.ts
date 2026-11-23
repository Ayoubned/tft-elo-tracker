import { NextResponse } from "next/server";
import { getSupabase } from "@/lib/supabase";
import { compareRanks } from "@/lib/ranking";
import { getProfileIconUrl } from "@/lib/riot";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const supabase = getSupabase();
    const { data: competition, error: competitionError } = await supabase
      .from("competitions").select("id,name,set_name,starts_at").eq("active", true).maybeSingle();
    if (competitionError) throw competitionError;
    if (!competition) return NextResponse.json({ competition: null, players: [], updatedAt: null });

    const { data, error } = await supabase
      .from("leaderboard_current")
      .select("player_id,game_name,tag_line,tier,division,league_points,fetched_at,wins,losses")
      .eq("competition_id", competition.id);
    if (error) throw error;

    const playerIds = (data ?? []).map((player) => player.player_id);
    const { data: playerDetails, error: playerDetailsError } = playerIds.length
      ? await supabase.from("players").select("id,profile_icon_id").in("id", playerIds)
      : { data: [], error: null };
    if (playerDetailsError) throw playerDetailsError;
    const iconByPlayerId = new Map((playerDetails ?? []).map((player) => [player.id, player.profile_icon_id as number | null]));

    const sortedPlayers = (data ?? []).sort(compareRanks);

    let lastPosition = 0;
    let lastPlayer: (typeof sortedPlayers)[number] | undefined;

    const players = await Promise.all(sortedPlayers.map(async (player, index) => {
      if (!lastPlayer || compareRanks(player, lastPlayer) !== 0) {
        lastPosition = index + 1;
      }

      lastPlayer = player;
      // Capture the position before awaiting the Data Dragon lookup.
      // Otherwise every async callback can read the final shared lastPosition.
      const position = lastPosition;
      const profileIconId = iconByPlayerId.get(player.player_id) ?? null;
      const profileIconUrl = await getProfileIconUrl(profileIconId);

      return {
        ...player,
        profile_icon_id: profileIconId,
        profile_icon_url: profileIconUrl,
        position,
      };
    }));

    return NextResponse.json({
      competition,
      players,
      updatedAt: players.reduce<string | null>((latest, p) => !latest || p.fetched_at > latest ? p.fetched_at : latest, null),
    });
  } catch (error) {
    console.error("Leaderboard error:", error);
    return NextResponse.json({ error: "Unable to load leaderboard." }, { status: 500 });
  }
}
