// src/pages/Home.tsx
import { useEffect, useMemo, useState } from "react";
import type { DataFile } from "../services/dataShape";
import type { Coaster, Manufacturer, Park, Rank } from "../types";
import { loadData } from "../services/dataManager";
import { positionToPoints } from "../logic/points";

type LoadState =
  | { status: "idle" | "loading" }
  | { status: "ready"; data: DataFile }
  | { status: "error"; message: string };

const LIST_ID = "main";

type PodiumItem = {
  id: string;
  name: string;
  points: number;
  extra?: string; // e.g., "Park · Mfr" or "Total: 123 · 7 coasters"
  count?: number;
};

export default function Home() {
  const [state, setState] = useState<LoadState>({ status: "idle" });

  useEffect(() => {
    (async () => {
      try {
        setState({ status: "loading" });
        const { data } = await loadData();
        if (!Array.isArray(data.ranks)) data.ranks = [];
        setState({ status: "ready", data });
      } catch (e: any) {
        setState({ status: "error", message: e?.message ?? "Failed to load data" });
      }
    })();
  }, []);

  const content = useMemo(() => {
    if (state.status !== "ready") return null;
    const data = state.data;

    // Basic lookups
    const coastersById = Object.fromEntries(data.coasters.map((c) => [c.id, c]));
    const parksById = Object.fromEntries(data.parks.map((p) => [p.id, p]));
    const mfrsById = Object.fromEntries(data.manufacturers.map((m) => [m.id, m]));

    // Filter to the main list and ensure numeric positions
    const ranksInList: Rank[] = (data.ranks ?? []).filter((r) => r.listId === LIST_ID);
    const totalRanked = ranksInList.length;

    // Points per coaster (based on Rankings page logic)
    const pointsByCoaster: Record<string, number> = {};
    for (const r of ranksInList) {
      const posNum = typeof r.position === "string" ? parseInt(r.position, 10) : r.position;
      if (!Number.isFinite(posNum)) continue;
      const pts = positionToPoints(posNum, totalRanked);
      pointsByCoaster[r.coasterId] = (pointsByCoaster[r.coasterId] ?? 0) + pts;
    }

    // Build podium for coasters
    const coasterItems: PodiumItem[] = Object.entries(pointsByCoaster)
      .map(([coasterId, points]) => {
        const c = coastersById[coasterId];
        if (!c) return null;
        const park = parksById[c.parkId];
        const mfr = mfrsById[c.manufacturerId];
        return {
          id: coasterId,
          name: c.name,
          points,
          extra: [park?.name, mfr?.name].filter(Boolean).join(" · "),
        } as PodiumItem;
      })
      .filter(Boolean as any)
      .sort((a, b) => b.points - a.points)
      .slice(0, 3);

    // Aggregate to parks/manufacturers
    const parkTotals: Record<string, { name: string; points: number; count: number }> = {};
    const mfrTotals: Record<string, { name: string; points: number; count: number }> = {};

    for (const [coasterId, points] of Object.entries(pointsByCoaster)) {
      const c = coastersById[coasterId];
      if (!c) continue;

      // Parks
      if (c.parkId) {
        const p = parksById[c.parkId];
        if (p) {
          parkTotals[c.parkId] ??= { name: p.name, points: 0, count: 0 };
          parkTotals[c.parkId].points += points;
          parkTotals[c.parkId].count += 1;
        }
      }

      // Manufacturers
      if (c.manufacturerId) {
        const m = mfrsById[c.manufacturerId];
        if (m) {
          mfrTotals[c.manufacturerId] ??= { name: m.name, points: 0, count: 0 };
          mfrTotals[c.manufacturerId].points += points;
          mfrTotals[c.manufacturerId].count += 1;
        }
      }
    }

    const parkItems: PodiumItem[] = Object.entries(parkTotals)
      .map(([id, v]) => ({
        id,
        name: v.name,
        points: v.points,
        count: v.count,
        extra: `Total: ${v.points} · ${v.count} coaster${v.count === 1 ? "" : "s"}`,
      }))
      .sort((a, b) => b.points - a.points)
      .slice(0, 3);

    const mfrItems: PodiumItem[] = Object.entries(mfrTotals)
      .map(([id, v]) => ({
        id,
        name: v.name,
        points: v.points,
        count: v.count,
        extra: `Total: ${v.points} · ${v.count} coaster${v.count === 1 ? "" : "s"}`,
      }))
      .sort((a, b) => b.points - a.points)
      .slice(0, 3);

    return { coasterItems, parkItems, mfrItems, totalRanked };
  }, [state]);

  if (state.status === "loading" || state.status === "idle") {
    return <div className="page"><p>Loading…</p></div>;
  }
  if (state.status === "error") {
    return <div className="page error"><p>{state.message}</p></div>;
  }
  if (!content) return null;

  const { coasterItems, parkItems, mfrItems, totalRanked } = content;

  return (
    <div className="page home">
      <Hero />

      <section className="podiums">
        <PodiumBlock
          title="Top 3 Coasters"
          subtitle={totalRanked ? `Based on ${totalRanked} ranked` : undefined}
          items={coasterItems}
        />
        <PodiumBlock title="Top 3 Parks" items={parkItems} />
        <PodiumBlock title="Top 3 Manufacturers" items={mfrItems} />
      </section>

      <QuickStats dataState={state} />
      <MainNav />
      <style>{styles}</style>
    </div>
  );
}

function Hero() {
  return (
    <header className="hero">
      <h1>Welcome to CoasterBook</h1>
      <p>Track, rank, and celebrate your coaster experiences.</p>
    </header>
  );
}

function PodiumBlock({ title, subtitle, items }: { title: string; subtitle?: string; items: PodiumItem[] }) {
  const medals = ["🥇", "🥈", "🥉"];
  return (
    <div className="podium-block">
      <div className="podium-head">
        <h2>{title}</h2>
        {subtitle ? <span className="sub">{subtitle}</span> : null}
      </div>
      <ol className="podium-list">
        {items.length === 0 && <li className="empty">No data yet</li>}
        {items.map((it, idx) => (
          <li key={it.id} className={`podium-item rank-${idx + 1}`}>
            <span className="medal" aria-label={`Rank ${idx + 1}`}>{medals[idx] ?? `${idx + 1}.`}</span>
            <div className="podium-main">
              <div className="name">{it.name}</div>
              {it.extra && <div className="extra">{it.extra}</div>}
            </div>
            <div className="points">{it.points}</div>
          </li>
        ))}
      </ol>
    </div>
  );
}

function QuickStats({ dataState }: { dataState: Extract<LoadState, { status: "ready" }> }) {
  const d = dataState.data;
  const totals = {
    coasters: d.coasters.length,
    parks: d.parks.length,
    manufacturers: d.manufacturers.length,
    ranked: (d.ranks ?? []).filter((r) => r.listId === LIST_ID).length,
  };
  return (
    <section className="quickstats">
      <div className="qs-card"><div className="qs-num">{totals.coasters}</div><div className="qs-label">Coasters</div></div>
      <div className="qs-card"><div className="qs-num">{totals.parks}</div><div className="qs-label">Parks</div></div>
      <div className="qs-card"><div className="qs-num">{totals.manufacturers}</div><div className="qs-label">Manufacturers</div></div>
      <div className="qs-card"><div className="qs-num">{totals.ranked}</div><div className="qs-label">Ranked Entries</div></div>
    </section>
  );
}

function MainNav() {
  return (
    <nav className="main-nav">
      <a className="nav-card" href="/rankings">
        <div className="nav-title">Rankings</div>
        <div className="nav-desc">Edit and view your ranked list</div>
      </a>
      <a className="nav-card" href="/stats">
        <div className="nav-title">Stats</div>
        <div className="nav-desc">Totals and averages by park & manufacturer</div>
      </a>
      <a className="nav-card" href="/data">
        <div className="nav-title">Data Entry</div>
        <div className="nav-desc">Manage coasters, parks, and manufacturers</div>
      </a>
    </nav>
  );
}

const styles = `
.page.home { display:flex; flex-direction:column; gap:2rem; padding:1.25rem; }
.hero { text-align:center; padding:1.5rem 0; }
.hero h1 { margin:0; font-size:2rem; }
.hero p { margin:.5rem 0 0; opacity:.8; }

.podiums { display:grid; gap:1rem; grid-template-columns: 1fr; }
@media (min-width: 900px) { .podiums { grid-template-columns: repeat(3, 1fr); } }

.podium-block { background:#1112; border:1px solid #0002; border-radius:12px; padding:1rem; }
.podium-head { display:flex; align-items:baseline; justify-content:space-between; margin-bottom:.5rem; }
.podium-head .sub { font-size:.85rem; opacity:.7; }
.podium-list { list-style:none; margin:0; padding:0; display:flex; flex-direction:column; gap:.5rem; }
.podium-item { display:grid; grid-template-columns:auto 1fr auto; gap:.75rem; align-items:center; padding:.5rem .75rem; border-radius:10px; background:#fff0; border:1px solid #0001; }
.podium-item .medal { font-size:1.25rem; }
.podium-item .name { font-weight:600; }
.podium-item .extra { font-size:.85rem; opacity:.75; }
.podium-item .points { font-variant-numeric: tabular-nums; font-weight:700; }

.podium-item.rank-1 { border-color: #d4af37aa; box-shadow: 0 0 0 2px #d4af3722 inset; }
.podium-item.rank-2 { border-color: #c0c0c0aa; box-shadow: 0 0 0 2px #c0c0c022 inset; }
.podium-item.rank-3 { border-color: #cd7f32aa; box-shadow: 0 0 0 2px #cd7f3222 inset; }

.quickstats { display:grid; grid-template-columns: repeat(2, 1fr); gap:.75rem; }
@media (min-width: 700px) { .quickstats { grid-template-columns: repeat(4, 1fr); } }
.qs-card { padding:1rem; border:1px solid #0002; border-radius:12px; text-align:center; }
.qs-num { font-size:1.5rem; font-weight:700; }
.qs-label { opacity:.75; }

.main-nav { display:grid; gap:.75rem; grid-template-columns: 1fr; }
@media (min-width: 900px) { .main-nav { grid-template-columns: repeat(3, 1fr); } }
.nav-card { display:block; padding:1rem; border:1px solid #0002; border-radius:12px; text-decoration:none; color:inherit; background:#1111; }
.nav-card:hover { transform: translateY(-1px); transition: transform .12s ease; }
.nav-title { font-weight:700; }
.nav-desc { opacity:.75; font-size:.9rem; margin-top:.25rem; }
`;
