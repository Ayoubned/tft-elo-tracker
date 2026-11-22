"use client";

import { useCallback, useEffect, useState } from "react";
import { Crown, RefreshCw, Shield, Users } from "lucide-react";

type Player = {
  player_id: string; game_name: string; tag_line: string; tier: string;
  division: string | null; league_points: number; fetched_at: string;
  wins: number; losses: number; position: number;
};
type Payload = { competition: { id: string; name: string; set_name: string } | null; players: Player[]; updatedAt: string | null };

const tierColor: Record<string, string> = {
  IRON: "text-slate-400", BRONZE: "text-orange-700", SILVER: "text-slate-300",
  GOLD: "text-amber-300", PLATINUM: "text-cyan-300", EMERALD: "text-emerald-300",
  DIAMOND: "text-sky-300", MASTER: "text-fuchsia-300", GRANDMASTER: "text-rose-300", CHALLENGER: "text-yellow-200",
};

function rankName(player: Player) {
  const name = player.tier
  ? player.tier.charAt(0) + player.tier.slice(1).toLowerCase()
  : "Unranked";
  return player.division && !["MASTER", "GRANDMASTER", "CHALLENGER"].includes(player.tier)
    ? `${name} ${player.division}` : name;
}

function timeAgo(value: string | null) {
  if (!value) return "Waiting for first sync";
  return `Updated ${new Intl.DateTimeFormat("en", { hour: "2-digit", minute: "2-digit" }).format(new Date(value))}`;
}

export default function Leaderboard() {
  const [data, setData] = useState<Payload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [adminOpen, setAdminOpen] = useState(false);
  const [adminSecret, setAdminSecret] = useState("");
  const [gameName, setGameName] = useState("");
  const [tagLine, setTagLine] = useState("");
  const [adminMessage, setAdminMessage] = useState("");
  const [adding, setAdding] = useState(false);

  const refresh = useCallback(async () => {
    try {
      const response = await fetch("/api/leaderboard", { cache: "no-store" });
      if (!response.ok) throw new Error("Couldn't load the leaderboard.");
      setData(await response.json()); setError("");
    } catch { setError("Leaderboard unavailable. Check the database setup."); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => {
    void refresh();
    const interval = setInterval(() => void refresh(), 60_000);
    return () => clearInterval(interval);
  }, [refresh]);

  async function addPlayer(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); setAdding(true); setAdminMessage("");
    try {
      const response = await fetch("/api/admin/players", {
        method: "POST", headers: { "Content-Type": "application/json", "x-admin-secret": adminSecret },
        body: JSON.stringify({ gameName, tagLine }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Could not add player.");
      setAdminMessage(`Added ${result.player.game_name}#${result.player.tag_line}. Run the first sync to fetch their rank.`);
      setGameName(""); setTagLine(""); await refresh();
    } catch (err) { setAdminMessage(err instanceof Error ? err.message : "Something went wrong."); }
    finally { setAdding(false); }
  }

  const players = data?.players ?? [];
  return <section>
    <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
      <div className="flex items-center gap-2 text-sm text-slate-400"><Users size={16} /> {players.length} players <span className="text-slate-700">·</span> {timeAgo(data?.updatedAt ?? null)}</div>
      <button onClick={() => void refresh()} className="inline-flex items-center gap-2 rounded-lg border border-white/10 bg-white/[0.04] px-3 py-2 text-xs font-semibold text-slate-300 transition hover:bg-white/10"><RefreshCw size={14} /> Refresh</button>
    </div>
    <div className="overflow-hidden rounded-2xl border border-white/10 bg-[#10131d]/90 shadow-2xl shadow-black/20">
      <div className="grid grid-cols-[54px_1fr_110px] gap-3 border-b border-white/10 bg-white/[0.03] px-5 py-4 text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500 sm:grid-cols-[70px_1fr_150px_110px]">
        <span>#</span><span>Player</span><span className="hidden sm:block">Rank</span><span className="text-right">LP</span>
      </div>
      {loading ? <div className="px-5 py-16 text-center text-sm text-slate-500">Loading leaderboard…</div> : error ? <div className="px-5 py-16 text-center text-sm text-rose-300">{error}</div> : players.length === 0 ? <div className="px-5 py-16 text-center"><Users className="mx-auto mb-3 text-slate-600" size={28}/><p className="font-semibold text-slate-300">No players yet</p><p className="mt-1 text-sm text-slate-500">The admin can add your group using Riot IDs below.</p></div> : players.map((player) => <div key={player.player_id} className="grid grid-cols-[54px_1fr_110px] items-center gap-3 border-b border-white/[0.06] px-5 py-4 last:border-0 sm:grid-cols-[70px_1fr_150px_110px]">
        <div className="flex items-center gap-1 font-mono text-sm text-slate-500">{player.position === 1 && <Crown size={15} className="text-amber-300"/>}{String(player.position).padStart(2, "0")}</div>
        <div className="min-w-0"><div className="truncate font-semibold text-slate-100">{player.game_name}</div><div className="truncate text-xs text-slate-500">#{player.tag_line}</div><div className={`mt-1 text-xs font-semibold sm:hidden ${tierColor[player.tier] ?? "text-slate-300"}`}>{rankName(player)}</div></div>
        <div className={`hidden text-sm font-semibold sm:block ${tierColor[player.tier] ?? "text-slate-300"}`}>{rankName(player)}</div>
        <div className="text-right"><div className="font-mono text-lg font-bold tabular-nums text-amber-200">{player.league_points.toLocaleString()} <span className="text-xs font-medium text-amber-300/60">LP</span></div><div className="text-[10px] text-slate-600">{player.wins}W · {player.losses}L</div></div>
      </div>)}
      <div className="flex items-center justify-between border-t border-white/10 bg-black/10 px-5 py-3"><span className="text-xs text-slate-600">Official Riot ranked data</span><button onClick={() => setAdminOpen(!adminOpen)} className="inline-flex items-center gap-1.5 text-xs text-slate-500 transition hover:text-amber-200"><Shield size={13}/> Admin</button></div>
    </div>
    {adminOpen && <div className="mt-5 rounded-2xl border border-amber-300/20 bg-[#11141d] p-5"><h2 className="mb-1 font-bold">Add a player</h2><p className="mb-4 text-xs text-slate-500">Enter the Riot ID exactly as shown in-game. The tagline can be entered with or without #.</p><form onSubmit={addPlayer} className="grid gap-3 sm:grid-cols-[1fr_160px_1fr_auto]"><input required value={gameName} onChange={(e) => setGameName(e.target.value)} placeholder="Game name" className="rounded-lg border border-white/10 bg-black/20 px-3 py-2.5 text-sm outline-none focus:border-amber-300/50"/><input required value={tagLine} onChange={(e) => setTagLine(e.target.value)} placeholder="Tagline" className="rounded-lg border border-white/10 bg-black/20 px-3 py-2.5 text-sm outline-none focus:border-amber-300/50"/><input required type="password" value={adminSecret} onChange={(e) => setAdminSecret(e.target.value)} placeholder="Admin secret" className="rounded-lg border border-white/10 bg-black/20 px-3 py-2.5 text-sm outline-none focus:border-amber-300/50"/><button disabled={adding} className="rounded-lg bg-amber-300 px-4 py-2.5 text-sm font-bold text-black transition hover:bg-amber-200 disabled:opacity-50">{adding ? "Adding…" : "Add player"}</button></form>{adminMessage && <p className="mt-3 text-xs text-slate-300">{adminMessage}</p>}</div>}
  </section>;
}
