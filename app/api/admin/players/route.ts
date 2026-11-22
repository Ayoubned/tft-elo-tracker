import { NextRequest, NextResponse } from "next/server";
import { timingSafeEqual } from "node:crypto";
import { getSupabase } from "@/lib/supabase";
import { getAccount } from "@/lib/riot";

function isAuthorized(request: NextRequest) {
  const expected = process.env.ADMIN_SECRET;
  const supplied = request.headers.get("x-admin-secret");
  if (!expected || !supplied) return false;
  const a = Buffer.from(expected);
  const b = Buffer.from(supplied);
  return a.length === b.length && timingSafeEqual(a, b);
}

export async function POST(request: NextRequest) {
  if (!isAuthorized(request)) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  try {
    const body = await request.json();
    const gameName = String(body.gameName ?? "").trim();
    const tagLine = String(body.tagLine ?? "").trim().replace(/^#/, "");
    if (!gameName || !tagLine || gameName.length > 100 || tagLine.length > 20) {
      return NextResponse.json({ error: "Enter a valid Riot ID and tagline." }, { status: 400 });
    }
    const account = await getAccount(gameName, tagLine);
    const supabase = getSupabase();
    const { data: competition, error: competitionError } = await supabase
      .from("competitions").select("id").eq("active", true).maybeSingle();
    if (competitionError) throw competitionError;
    if (!competition) return NextResponse.json({ error: "Create an active competition first." }, { status: 409 });

    const { data: player, error: playerError } = await supabase.from("players").upsert({
      puuid: account.puuid,
      game_name: account.gameName,
      tag_line: account.tagLine,
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
