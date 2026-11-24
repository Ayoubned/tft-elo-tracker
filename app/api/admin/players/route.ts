import { NextRequest, NextResponse } from "next/server";
import { getSupabase } from "@/lib/supabase";
import { isAdminRequest } from "@/lib/admin-auth";
import { getAccount, getSummonerProfileIconId } from "@/lib/riot";


export async function POST(request: NextRequest) {
  if (!isAdminRequest(request)) return NextResponse.json({ error: "Admin session required. Please sign in again." }, { status: 401 });
  try {
    const body = await request.json();
    const gameName = String(body.gameName ?? "").trim();
    const tagLine = String(body.tagLine ?? "").trim().replace(/^#/, "");
    if (!gameName || !tagLine || gameName.length > 100 || tagLine.length > 20) {
      return NextResponse.json({ error: "Enter a valid Riot ID and tagline." }, { status: 400 });
    }
    const account = await getAccount(gameName, tagLine);
    let profileIconId: number | null = null;
    try { profileIconId = await getSummonerProfileIconId(account.puuid); } catch (iconError) { console.warn("Could not fetch summoner icon:", iconError); }
    const supabase = getSupabase();
    const { data: competition, error: competitionError } = await supabase
      .from("competitions").select("id").eq("active", true).maybeSingle();
    if (competitionError) throw competitionError;
    if (!competition) return NextResponse.json({ error: "Create an active competition first." }, { status: 409 });

    const { data: player, error: playerError } = await supabase.from("players").upsert({
      puuid: account.puuid,
      game_name: account.gameName,
      tag_line: account.tagLine,
      profile_icon_id: profileIconId,
      platform: process.env.RIOT_PLATFORM_ROUTING || "euw1",
      active: true,
    }, { onConflict: "puuid" }).select("id,game_name,tag_line").single();
    if (playerError) throw playerError;
    const { error: membershipError } = await supabase.from("competition_players").upsert({
      competition_id: competition.id, player_id: player.id,
    }, { onConflict: "competition_id,player_id" });
    if (membershipError) throw membershipError;
    return NextResponse.json({ player }, { status: 201 });
  } catch (error) {
    console.error("Add player error:", error);
    const status = (error as { status?: number }).status;
    return NextResponse.json({ error: status === 404 ? "Riot ID not found." : "Could not add this player. Check the Riot API key and account details." }, { status: status === 404 ? 404 : 500 });
  }
}

export async function DELETE(request: NextRequest) {
  if (!isAdminRequest(request)) {
    return NextResponse.json({ error: "Admin session required. Please sign in again." }, { status: 401 });
  }

  try {
    const body = await request.json();
    const playerId = String(body.playerId ?? "").trim();
    if (!playerId) {
      return NextResponse.json({ error: "A player ID is required." }, { status: 400 });
    }

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

    // Remove only the competition membership. Keep player and snapshots for history.
    const { data, error } = await supabase
      .from("competition_players")
      .delete()
      .eq("competition_id", competition.id)
      .eq("player_id", playerId)
      .select("player_id")
      .maybeSingle();

    if (error) throw error;
    if (!data) {
      return NextResponse.json({ error: "Player is not in the active competition." }, { status: 404 });
    }

    return NextResponse.json({ removed: true, playerId });
  } catch (error) {
    console.error("Remove player error:", error);
    return NextResponse.json({ error: "Could not remove this player." }, { status: 500 });
  }
}
