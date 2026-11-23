"use client";

import { useCallback, useEffect, useState } from "react";
import { Crown, RefreshCw, Shield, Users, Trash2 } from "lucide-react";
import LPHistory from "@/components/lp-history";
import Link from "next/link";

type Player = {
  player_id: string; game_name: string; tag_line: string; tier: string | null;
  division: string | null; league_points: number | null; fetched_at: string | null;
  wins: number | null; losses: number | null; position: number;
  profile_icon_id?: number | null; profile_icon_url?: string | null;
};
type Payload = { competition: { id: string; name: string; set_name: string } | null; players: Player[]; updatedAt: string | null };
type SyncResult = { updated: number; unchanged: number; unranked: number; failed: number; error?: string };

const tierColor: Record<string, string> = {
  IRON: "text-slate-400", BRONZE: "text-orange-700", SILVER: "text-slate-300",
  GOLD: "text-amber-300", PLATINUM: "text-cyan-300", EMERALD: "text-emerald-300",
  DIAMOND: "text-sky-300", MASTER: "text-fuchsia-300", GRANDMASTER: "text-rose-300", CHALLENGER: "text-yellow-200",
};

function rankName(player: Player) {
  if (!player.tier) return "Unranked";
  const name = player.tier.charAt(0) + player.tier.slice(1).toLowerCase();
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
  const [syncing, setSyncing] = useState(false);
  const [deletingPlayerId, setDeletingPlayerId] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      const response = await fetch("/api/leaderboard", { cache: "no-store" });
      if (!response.ok) throw new Error("Couldn't load the leaderboard.");
      setData(await response.json());
      setError("");
    } catch {
      setError("Leaderboard unavailable. Check the database setup.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
    const interval = setInterval(() => void refresh(), 60_000);
    return () => clearInterval(interval);
  }, [refresh]);

  async function syncNow() {
    if (!adminSecret) {
      setAdminOpen(true);
      setAdminMessage("Enter your admin secret below, then click Sync now again.");
      return;
    }

    setSyncing(true);
    setAdminMessage("");
    try {
      const response = await fetch("/api/admin/sync", {
        method: "POST",
        headers: { "x-admin-secret": adminSecret },
      });
      const result = await response.json() as SyncResult;
      if (!response.ok) throw new Error(result.error || (response.status === 401 ? "Invalid admin secret." : "Synchronization failed."));

      await refresh();
      setAdminOpen(true);
      setAdminMessage(`Sync complete: ${result.updated} updated, ${result.unchanged} unchanged, ${result.unranked} unranked, ${result.failed} failed.`);
    } catch (err) {
      setAdminOpen(true);
      setAdminMessage(err instanceof Error ? err.message : "Synchronization failed. Please try again.");
    } finally {
      setSyncing(false);
    }
  }

  async function addPlayer(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setAdding(true);
    setAdminMessage("");
    try {
      const response = await fetch("/api/admin/players", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-admin-secret": adminSecret },
        body: JSON.stringify({ gameName, tagLine }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Could not add player.");
      setAdminMessage(`Added ${result.player.game_name}#${result.player.tag_line}. Click Sync now to fetch their rank.`);
      setGameName("");
      setTagLine("");
      await refresh();
    } catch (err) {
      setAdminMessage(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setAdding(false);
    }
  }

  async function deletePlayer(player: Player) {
    if (!adminSecret) {
      setAdminOpen(true);
      setAdminMessage("Enter your admin secret before removing a player.");
      return;
    }
    const confirmed = window.confirm(
      `Remove ${player.game_name}#${player.tag_line} from this competition? Their historical rank snapshots will be preserved.`
    );
    if (!confirmed) return;

    setDeletingPlayerId(player.player_id);
    setAdminMessage("");
    try {
      const response = await fetch("/api/admin/players", {
        method: "DELETE",
        headers: { "Content-Type": "application/json", "x-admin-secret": adminSecret },
        body: JSON.stringify({ playerId: player.player_id }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Could not remove player.");
      await refresh();
      setAdminOpen(true);
      setAdminMessage(`Removed ${player.game_name}#${player.tag_line} from this competition. Historical data was preserved.`);
    } catch (err) {
      setAdminOpen(true);
      setAdminMessage(err instanceof Error ? err.message : "Could not remove player.");
    } finally {
      setDeletingPlayerId(null);
    }
  }

  const players = data?.players ?? [];
  return <section>
    <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
      <div className="flex items-center gap-2 text-sm text-slate-400"><Users size={16} /> {players.length} players <span className="text-slate-700">·</span> {timeAgo(data?.updatedAt ?? null)}</div>
      <button onClick={() => void syncNow()} disabled={syncing} className="inline-flex items-center gap-2 rounded-lg border border-white/10 bg-white/[0.04] px-3 py-2 text-xs font-semibold text-slate-300 transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-60">
        <RefreshCw size={14} className={syncing ? "animate-spin" : ""} /> {syncing ? "Syncing…" : "Sync now"}
      </button>
    </div>
    <div className="overflow-hidden rounded-2xl border border-white/10 bg-[#10131d]/90 shadow-2xl shadow-black/20">
      <div className={`grid ${adminOpen ? "grid-cols-[54px_1fr_110px_40px]" : "grid-cols-[54px_1fr_110px]"} gap-3 border-b border-white/10 bg-white/[0.03] px-5 py-4 text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500 sm:grid-cols-[70px_1fr_150px_110px_48px]`}>
        <span>#</span><span>Player</span><span className="hidden sm:block">Rank</span><span className="text-right">LP</span>{adminOpen && <span className="text-right">Remove</span>}
      </div>
      {loading ? <div className="px-5 py-16 text-center text-sm text-slate-500">Loading leaderboard…</div> : error ? <div className="px-5 py-16 text-center text-sm text-rose-300">{error}</div> : players.length === 0 ? <div className="px-5 py-16 text-center"><Users className="mx-auto mb-3 text-slate-600" size={28}/><p className="font-semibold text-slate-300">No players yet</p><p className="mt-1 text-sm text-slate-500">The admin can add your group using Riot IDs below.</p></div> : players.map((player) => <div key={player.player_id} className={`grid ${adminOpen ? "grid-cols-[54px_1fr_110px_40px]" : "grid-cols-[54px_1fr_110px]"} items-center gap-3 border-b border-white/[0.06] px-5 py-4 last:border-0 sm:grid-cols-[70px_1fr_150px_110px_48px]`}>
        <div className="flex items-center gap-1 font-mono text-sm text-slate-500">{player.position === 1 && <Crown size={15} className="text-amber-300"/>}{String(player.position).padStart(2, "0")}</div>
        <div className="flex min-w-0 items-center gap-3"><div className="size-10 shrink-0 overflow-hidden rounded-lg border border-white/10 bg-white/[0.04]">{player.profile_icon_url ? <img src={player.profile_icon_url} alt="" className="size-full object-cover" loading="lazy" /> : <div className="grid size-full place-items-center text-sm font-bold text-slate-400">{player.game_name.slice(0, 1).toUpperCase()}</div>}</div><div className="min-w-0"><Link href={`/players/${encodeURIComponent(player.player_id)}`} className="truncate font-semibold text-slate-100 transition hover:text-amber-200" title={`View ${player.game_name} profile`}>{player.game_name}</Link><div className="truncate text-xs text-slate-500">#{player.tag_line}</div><div className={`mt-1 text-xs font-semibold sm:hidden ${(player.tier && tierColor[player.tier]) || "text-slate-400"}`}>{rankName(player)}</div></div></div>
        <div className={`hidden text-sm font-semibold sm:block ${(player.tier && tierColor[player.tier]) || "text-slate-400"}`}>{rankName(player)}</div>
        <div className="text-right"><div className="font-mono text-lg font-bold tabular-nums text-amber-200">{player.league_points == null ? "—" : player.league_points.toLocaleString()} <span className="text-xs font-medium text-amber-300/60">LP</span></div><div className="text-[10px] text-slate-600">{player.wins == null || player.losses == null ? "—" : `${player.wins}W · ${player.losses}L`}</div></div>
        {adminOpen && <div className="text-right"><button type="button" title={`Remove ${player.game_name}`} aria-label={`Remove ${player.game_name}`} disabled={deletingPlayerId === player.player_id} onClick={() => void deletePlayer(player)} className="inline-flex items-center justify-center rounded-md border border-rose-400/20 p-2 text-rose-300 transition hover:bg-rose-400/10 disabled:opacity-40"><Trash2 size={14}/></button></div>}
      </div>)}
      <div className="flex items-center justify-between border-t border-white/10 bg-black/10 px-5 py-3"><span className="text-xs text-slate-600">Official Riot ranked data</span><button onClick={() => setAdminOpen(!adminOpen)} className="inline-flex items-center gap-1.5 text-xs text-slate-500 transition hover:text-amber-200"><Shield size={13}/> Admin</button></div>
    </div>
    {adminOpen && <div className="mt-5 rounded-2xl border border-amber-300/20 bg-[#11141d] p-5"><h2 className="mb-1 font-bold">Manage players</h2><p className="mb-4 text-xs text-slate-500">Add players, remove participants, or manually synchronize all active players. Removing a player preserves historical snapshots.</p><form onSubmit={addPlayer} className="grid gap-3 sm:grid-cols-[1fr_160px_1fr_auto]"><input required value={gameName} onChange={(e) => setGameName(e.target.value)} placeholder="Game name" className="rounded-lg border border-white/10 bg-black/20 px-3 py-2.5 text-sm outline-none focus:border-amber-300/50"/><input required value={tagLine} onChange={(e) => setTagLine(e.target.value)} placeholder="Tagline" className="rounded-lg border border-white/10 bg-black/20 px-3 py-2.5 text-sm outline-none focus:border-amber-300/50"/><input required type="password" value={adminSecret} onChange={(e) => setAdminSecret(e.target.value)} placeholder="Admin secret" className="rounded-lg border border-white/10 bg-black/20 px-3 py-2.5 text-sm outline-none focus:border-amber-300/50"/><button disabled={adding} className="rounded-lg bg-amber-300 px-4 py-2.5 text-sm font-bold text-black transition hover:bg-amber-200 disabled:opacity-50">{adding ? "Adding…" : "Add player"}</button></form><button type="button" onClick={() => void syncNow()} disabled={syncing} className="mt-3 inline-flex items-center gap-2 rounded-lg border border-amber-300/30 px-4 py-2.5 text-sm font-semibold text-amber-200 hover:bg-amber-300/10 disabled:opacity-50"><RefreshCw size={14} className={syncing ? "animate-spin" : ""}/>{syncing ? "Syncing…" : "Sync now"}</button>{adminMessage && <p role="status" className="mt-3 text-xs text-slate-300">{adminMessage}</p>}</div>}
    <LPHistory players={players.map(({ player_id, game_name, tag_line }) => ({ player_id, game_name, tag_line }))} />
  </section>;
}
