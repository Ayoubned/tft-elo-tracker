import { NextResponse } from "next/server";
import { getSupabase } from "@/lib/supabase";
import { compareRanks } from "@/lib/ranking";

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
    const players = (data ?? []).sort(compareRanks).map((player, index, all) => ({
      ...player,
      position: index > 0 && compareRanks(player, all[index - 1]) === 0 ? all[index - 1].position : index + 1,
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
