import Leaderboard from "@/components/leaderboard";

export default function Home() {
  return <main className="min-h-screen bg-[radial-gradient(ellipse_at_top,_rgba(116,91,48,0.18),_transparent_55%)]">
    <div className="mx-auto max-w-6xl px-5 py-10 sm:px-8 sm:py-14">
      <header className="mb-10 flex flex-col gap-4 border-b border-white/10 pb-8 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.24em] text-amber-300"><span className="h-2 w-2 rounded-full bg-emerald-400" /> Friends ranked race</div>
          <h1 className="text-4xl font-black tracking-tight sm:text-5xl">TFT <span className="text-amber-300">Ladder</span></h1>
          <p className="mt-3 max-w-xl text-sm text-slate-400">One lobby. One ladder. Bragging rights are on the line.</p>
        </div>
        <div className="rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm">
          <div className="text-xs uppercase tracking-wider text-slate-500">Competition</div>
          <div className="mt-1 font-semibold">{process.env.NEXT_PUBLIC_COMPETITION_NAME || "Current Set — Friends Ladder"}</div>
        </div>
      </header>
      <Leaderboard />
      <footer className="mt-12 flex flex-col gap-2 border-t border-white/10 pt-5 text-xs text-slate-600 sm:flex-row sm:justify-between">
        <span>Unofficial community project. Not affiliated with Riot Games.</span>
        <span>Rank data refreshes every 30 minutes.</span>
      </footer>
    </div>
  </main>;
}
