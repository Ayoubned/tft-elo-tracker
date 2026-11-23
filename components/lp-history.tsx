"use client";

import { useEffect, useMemo, useState } from "react";
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

type PlayerOption = { player_id: string; game_name: string; tag_line: string };
type HistoryPoint = { date: string; tier: string; division: string | null; lp: number; score: number };

function rankLabel(point: HistoryPoint) {
  const tier = point.tier.charAt(0) + point.tier.slice(1).toLowerCase();
  return point.division && !["MASTER", "GRANDMASTER", "CHALLENGER"].includes(point.tier)
    ? `${tier} ${point.division}`
    : tier;
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }).format(new Date(value));
}

export default function LPHistory({ players }: { players: PlayerOption[] }) {
  const [selectedId, setSelectedId] = useState(players[0]?.player_id ?? "");
  const [points, setPoints] = useState<HistoryPoint[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!players.some((player) => player.player_id === selectedId)) {
      setSelectedId(players[0]?.player_id ?? "");
    }
  }, [players, selectedId]);

  useEffect(() => {
    if (!selectedId) {
      setPoints([]);
      return;
    }
    const controller = new AbortController();
    async function loadHistory() {
      setLoading(true);
      setError("");
      try {
        const response = await fetch(`/api/players/${encodeURIComponent(selectedId)}/history`, {
          cache: "no-store",
          signal: controller.signal,
        });
        const result = await response.json();
        if (!response.ok) throw new Error(result.error || "Could not load progression.");
        setPoints(result.points ?? []);
      } catch (err) {
        if (err instanceof Error && err.name === "AbortError") return;
        setError(err instanceof Error ? err.message : "Could not load progression.");
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }
    void loadHistory();
    return () => controller.abort();
  }, [selectedId]);

  const selectedPlayer = useMemo(() => players.find((player) => player.player_id === selectedId), [players, selectedId]);
  const delta = points.length > 1 ? points[points.length - 1].score - points[0].score : 0;

  return (
    <section className="mt-6 rounded-2xl border border-white/10 bg-[#10131d]/90 p-5 shadow-2xl shadow-black/20 sm:p-6">
      <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-amber-300">Set progression</p>
          <h2 className="mt-1 text-xl font-bold text-slate-100">LP history</h2>
          <p className="mt-1 max-w-xl text-xs text-slate-500">Rank movement over time, based on saved Riot rank snapshots.</p>
        </div>
        <select
          aria-label="Choose player"
          value={selectedId}
          onChange={(event) => setSelectedId(event.target.value)}
          className="max-w-full rounded-lg border border-white/10 bg-[#171b28] px-3 py-2 text-sm text-slate-200 outline-none focus:border-amber-300/50"
        >
          {players.map((player) => (
            <option key={player.player_id} value={player.player_id}>{player.game_name}#{player.tag_line}</option>
          ))}
        </select>
      </div>

      {loading ? (
        <div className="grid h-64 place-items-center text-sm text-slate-500">Loading progression…</div>
      ) : error ? (
        <div className="grid h-64 place-items-center text-sm text-rose-300">{error}</div>
      ) : points.length === 0 ? (
        <div className="grid h-64 place-items-center text-center">
          <div>
            <p className="font-semibold text-slate-300">No rank history yet</p>
            <p className="mt-1 max-w-sm text-xs text-slate-500">A history point is saved whenever Riot reports a change in this player’s rank or LP. Unranked players will appear here after their first ranked snapshot.</p>
          </div>
        </div>
      ) : (
        <>
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2 text-xs">
            <span className="text-slate-400">{selectedPlayer?.game_name ?? "Player"} · {points.length} snapshots</span>
            <span className={delta > 0 ? "font-semibold text-emerald-300" : delta < 0 ? "font-semibold text-rose-300" : "text-slate-400"}>
              {delta > 0 ? "+" : ""}{delta.toLocaleString()} progression points
            </span>
          </div>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={points} margin={{ top: 8, right: 12, bottom: 4, left: -16 }}>
                <CartesianGrid stroke="rgba(255,255,255,0.07)" strokeDasharray="3 3" />
                <XAxis dataKey="date" tickFormatter={formatDate} minTickGap={32} tick={{ fill: "#64748b", fontSize: 10 }} axisLine={false} tickLine={false} />
                <YAxis domain={["dataMin - 100", "dataMax + 100"]} tick={{ fill: "#64748b", fontSize: 10 }} axisLine={false} tickLine={false} />
                <Tooltip
                  contentStyle={{ background: "#171b28", border: "1px solid rgba(255,255,255,0.12)", borderRadius: 12, color: "#e2e8f0" }}
                  labelFormatter={(label) => formatDate(String(label))}
                  formatter={(value, _name, item) => [`${rankLabel(item.payload)} · ${item.payload.lp} LP`, "Rank"]}
                />
                <Line type="monotone" dataKey="score" stroke="#fbbf24" strokeWidth={2.5} dot={{ r: 3, fill: "#fbbf24", strokeWidth: 0 }} activeDot={{ r: 5, fill: "#fde68a" }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
          <p className="mt-2 text-[10px] leading-relaxed text-slate-600">The vertical axis is a display-only progression score that combines tier, division and LP. It is not Riot’s official LP value. History begins when snapshots are collected; earlier rank history cannot be reconstructed.</p>
        </>
      )}
    </section>
  );
}
