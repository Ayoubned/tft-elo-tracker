"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, Trophy, TrendingUp, TrendingDown, Minus, UserRound } from "lucide-react";
import {
  CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from "recharts";

type Player = {
  player_id: string;
  game_name: string;
  tag_line: string;
  tier: string | null;
  division: string | null;
  league_points: number | null;
  fetched_at: string | null;
  wins: number | null;
  losses: number | null;
  position: number;
  profile_icon_id?: number | null;
  profile_icon_url?: string | null;
};
type Point = {
  date: string;
  tier: string;
  division: string | null;
  lp: number;
  score: number;
};
type ProfilePayload = { competition: { name: string; set_name: string } | null; players: Player[] };
type HistoryPayload = { points: Point[] };

function rankLabel(player: Player) {
  if (!player.tier) return "Unranked";
  const name = player.tier.charAt(0) + player.tier.slice(1).toLowerCase();
  return player.division && !["MASTER", "GRANDMASTER", "CHALLENGER"].includes(player.tier)
    ? `${name} ${player.division}` : name;
}
function dateLabel(value: string) {
  return new Intl.DateTimeFormat("en", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }).format(new Date(value));
}
function signed(value: number) {
  return `${value > 0 ? "+" : ""}${value.toLocaleString()}`;
}

export default function PlayerProfilePage() {
  const params = useParams<{ playerId: string }>();
  const playerId = params.playerId;
  const [player, setPlayer] = useState<Player | null>(null);
  const [competitionName, setCompetitionName] = useState("");
  const [points, setPoints] = useState<Point[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const controller = new AbortController();
    async function load() {
      setLoading(true);
      setError("");
      try {
        const [leaderboardResponse, historyResponse] = await Promise.all([
          fetch("/api/leaderboard", { cache: "no-store", signal: controller.signal }),
          fetch(`/api/players/${encodeURIComponent(playerId)}/history`, { cache: "no-store", signal: controller.signal }),
        ]);
        const leaderboard = await leaderboardResponse.json() as ProfilePayload;
        const history = await historyResponse.json() as HistoryPayload & { error?: string };
        if (!leaderboardResponse.ok) throw new Error("Could not load player information.");
        if (!historyResponse.ok) throw new Error(history.error || "Could not load player history.");
        const found = leaderboard.players?.find((item) => item.player_id === playerId);
        if (!found) throw new Error("This player is not in the active competition.");
        setPlayer(found);
        setCompetitionName(`${leaderboard.competition?.name ?? "TFT Friends Ladder"} · ${leaderboard.competition?.set_name ?? ""}`);
        setPoints(history.points ?? []);
      } catch (err) {
        if (err instanceof Error && err.name === "AbortError") return;
        setError(err instanceof Error ? err.message : "Unable to load this profile.");
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }
    if (playerId) void load();
    return () => controller.abort();
  }, [playerId]);

  const delta = useMemo(
    () => points.length > 1 ? points[points.length - 1].score - points[0].score : 0,
    [points],
  );
  const peak = useMemo(() => points.reduce<Point | null>((best, point) => !best || point.score > best.score ? point : best, null), [points]);
  const totalGames = player?.wins != null && player.losses != null ? player.wins + player.losses : null;
  const winRate = totalGames && player?.wins != null ? (player.wins / totalGames) * 100 : null;

  if (loading) return <main className="mx-auto max-w-5xl px-5 py-12 text-sm text-slate-400">Loading player profile…</main>;
  if (error || !player) return <main className="mx-auto max-w-5xl px-5 py-12"><Link href="/" className="mb-6 inline-flex items-center gap-2 text-sm text-slate-400 hover:text-amber-200"><ArrowLeft size={16}/> Back to leaderboard</Link><p className="rounded-xl border border-rose-400/20 bg-rose-400/5 p-5 text-sm text-rose-300">{error || "Player not found."}</p></main>;

  return (
    <main className="mx-auto max-w-5xl px-5 py-8 sm:py-12">
      <Link href="/" className="mb-7 inline-flex items-center gap-2 text-sm text-slate-400 transition hover:text-amber-200"><ArrowLeft size={16}/> Back to leaderboard</Link>
      <section className="overflow-hidden rounded-2xl border border-white/10 bg-[#10131d]/90 shadow-2xl shadow-black/20">
        <div className="border-b border-white/10 bg-gradient-to-r from-amber-300/10 via-transparent to-fuchsia-400/10 p-6 sm:p-8">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="size-16 shrink-0 overflow-hidden rounded-2xl border border-amber-300/20 bg-amber-300/10">{player.profile_icon_url ? <img src={player.profile_icon_url} alt={`${player.game_name} summoner icon`} className="size-full object-cover" /> : <div className="grid size-full place-items-center text-amber-200"><UserRound size={26}/></div>}</div>
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.18em] text-amber-300">Player profile</p>
                <h1 className="mt-1 text-2xl font-black text-white sm:text-3xl">{player.game_name}</h1>
                <p className="text-sm text-slate-400">#{player.tag_line} · {competitionName}</p>
              </div>
            </div>
            <div className="rounded-xl border border-white/10 bg-black/20 px-4 py-3 text-right">
              <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Leaderboard position</p>
              <p className="text-2xl font-black text-amber-200">#{player.position}</p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-px bg-white/10 sm:grid-cols-4">
          <div className="bg-[#10131d] p-5"><p className="text-xs text-slate-500">Current rank</p><p className="mt-2 text-lg font-bold text-slate-100">{rankLabel(player)}</p></div>
          <div className="bg-[#10131d] p-5"><p className="text-xs text-slate-500">Current LP</p><p className="mt-2 text-lg font-bold text-amber-200">{player.league_points == null ? "—" : `${player.league_points.toLocaleString()} LP`}</p></div>
          <div className="bg-[#10131d] p-5"><p className="text-xs text-slate-500">Ranked record</p><p className="mt-2 text-lg font-bold text-slate-100">{player.wins == null || player.losses == null ? "—" : `${player.wins}W · ${player.losses}L`}</p></div>
          <div className="bg-[#10131d] p-5"><p className="text-xs text-slate-500">Win rate</p><p className="mt-2 text-lg font-bold text-slate-100">{winRate == null ? "—" : `${winRate.toFixed(1)}%`}</p></div>
        </div>
      </section>

      <section className="mt-6 rounded-2xl border border-white/10 bg-[#10131d]/90 p-5 sm:p-6">
        <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
          <div><p className="text-xs font-bold uppercase tracking-[0.18em] text-amber-300">Set progression</p><h2 className="mt-1 text-xl font-bold text-white">LP history</h2><p className="mt-1 text-xs text-slate-500">Based on saved Riot rank snapshots.</p></div>
          <div className={`flex items-center gap-1.5 text-sm font-semibold ${delta > 0 ? "text-emerald-300" : delta < 0 ? "text-rose-300" : "text-slate-400"}`}>
            {delta > 0 ? <TrendingUp size={16}/> : delta < 0 ? <TrendingDown size={16}/> : <Minus size={16}/>}
            {points.length > 1 ? `${signed(delta)} progression points` : "Not enough history"}
          </div>
        </div>
        {points.length < 2 ? (
          <div className="grid h-64 place-items-center text-center"><div><p className="font-semibold text-slate-300">Not enough rank history yet</p><p className="mt-1 max-w-md text-xs text-slate-500">The chart appears after at least two different rank snapshots have been recorded. Unranked players can still have a profile.</p></div></div>
        ) : (
          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={points} margin={{ top: 8, right: 12, bottom: 4, left: -16 }}>
                <CartesianGrid stroke="rgba(255,255,255,0.07)" strokeDasharray="3 3"/>
                <XAxis dataKey="date" tickFormatter={dateLabel} minTickGap={32} tick={{ fill: "#64748b", fontSize: 10 }} axisLine={false} tickLine={false}/>
                <YAxis domain={["dataMin - 100", "dataMax + 100"]} tick={{ fill: "#64748b", fontSize: 10 }} axisLine={false} tickLine={false}/>
                <Tooltip contentStyle={{ background: "#171b28", border: "1px solid rgba(255,255,255,0.12)", borderRadius: 12, color: "#e2e8f0" }} labelFormatter={(label) => dateLabel(String(label))} formatter={(value, _name, item) => [`${item.payload.tier} ${item.payload.division ?? ""} · ${item.payload.lp} LP`, "Rank"]}/>
                <Line type="monotone" dataKey="score" stroke="#fbbf24" strokeWidth={2.5} dot={{ r: 3, fill: "#fbbf24", strokeWidth: 0 }} activeDot={{ r: 5, fill: "#fde68a" }}/>
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <div className="rounded-xl border border-white/5 bg-white/[0.03] p-4"><div className="flex items-center gap-2 text-xs text-slate-500"><Trophy size={14}/> Peak recorded rank</div><p className="mt-2 font-bold text-slate-100">{peak ? `${peak.tier} ${peak.division ?? ""} · ${peak.lp} LP` : "No ranked snapshots yet"}</p></div>
          <div className="rounded-xl border border-white/5 bg-white/[0.03] p-4"><p className="text-xs text-slate-500">Recorded snapshots</p><p className="mt-2 font-bold text-slate-100">{points.length}</p></div>
        </div>
        <p className="mt-4 text-[10px] leading-relaxed text-slate-600">Progression points are a display-only score combining tier, division and LP. They are not Riot's official LP. History starts when snapshots are collected.</p>
      </section>
    </main>
  );
}
