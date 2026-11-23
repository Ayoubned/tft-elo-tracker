import { NextRequest, NextResponse } from "next/server";
import { getSupabase } from "@/lib/supabase";
import { toProgressionScore } from "@/lib/progression";

export const dynamic = "force-dynamic";

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ playerId: string }> },
) {
  try {
    const { playerId } = await context.params;
    const supabase = getSupabase();

    const { data: competition, error: competitionError } = await supabase
      .from("competitions")
      .select("id")
      .eq("active", true)
      .maybeSingle();
    if (competitionError) throw competitionError;
    if (!competition) return NextResponse.json({ points: [] });

    const { data: membership, error: membershipError } = await supabase
      .from("competition_players")
      .select("player_id")
      .eq("competition_id", competition.id)
      .eq("player_id", playerId)
      .maybeSingle();
    if (membershipError) throw membershipError;
    if (!membership) return NextResponse.json({ error: "Player not found in the active competition." }, { status: 404 });

    const { data, error } = await supabase
      .from("rank_snapshots")
      .select("tier,division,league_points,fetched_at")
      .eq("competition_id", competition.id)
      .eq("player_id", playerId)
      .order("fetched_at", { ascending: true });
    if (error) throw error;

    const points = (data ?? []).map((snapshot) => ({
      date: snapshot.fetched_at,
      tier: snapshot.tier,
      division: snapshot.division,
      lp: snapshot.league_points,
      score: toProgressionScore(snapshot.tier, snapshot.division, snapshot.league_points),
    }));

    return NextResponse.json({ points });
  } catch (error) {
    console.error("Player history error:", error);
    return NextResponse.json({ error: "Unable to load player history." }, { status: 500 });
  }
}
