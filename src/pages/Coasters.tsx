// src/pages/Coasters.tsx
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

type Mode = "parks" | "manufacturers";

type CoasterWithPoints = Coaster & {
  points: number;
  park?: Park | null;
  manufacturer?: Manufacturer | null;
};

type GroupRow = {
  id: string;
  name: string;
  totalPoints: number;
  count: number;
  items: CoasterWithPoints[];
};

export default function Coasters() {
  const [state, setState] = useState<LoadState>({ status: "idle" });
  const [mode, setMode] = useState<Mode>("parks");

  useEffect(() => {
    (async () => {
      setState({ status: "loading" });
      try {
        const { data } = await loadData();
        if (!Array.isArray(data.ranks)) data.ranks = [];
        setState({ status: "ready", data });
      } catch (e: any) {
        setState({ status: "error", message: e?.message ?? "Failed to load data" });
      }
    })();
  }, []);

  const { groups } = useMemo(() => {
    if (state.status !== "ready") return { groups: [] as GroupRow[] };

    const { parks, manufacturers, coasters, ranks } = state.data;

    // Quick lookup maps
    const parkMap = new Map(parks.map((p) => [p.id, p]));
    const manMap = new Map(manufacturers.map((m) => [m.id, m]));
    const rankMap = new Map<string, Rank>();
    for (const r of ranks) {
      // Assuming each coaster has at most one rank in the main list.
      // If multiple, keep the best (highest points).
      const current = rankMap.get(r.coasterId);
      const newPts = positionToPoints(LIST_ID, r.position);
      if (!current) {
        rankMap.set(r.coasterId, r);
      } else {
        const curPts = positionToPoints(LIST_ID, current.position);
        if (newPts > curPts) rankMap.set(r.coasterId, r);
      }
    }

    // Attach points to each coaster
    const withPoints: CoasterWithPoints[] = coasters.map((c) => {
      const rank = rankMap.get(c.id);
      const pts = rank ? positionToPoints(LIST_ID, rank.position) : 0;
      return {
        ...c,
        points: pts,
        park: c.parkId ? parkMap.get(c.parkId) ?? null : null,
        manufacturer: c.manufacturerId ? manMap.get(c.manufacturerId) ?? null : null,
      };
    });

    // Sort coasters within each group by points desc, name asc
    const byPointsThenName = (a: CoasterWithPoints, b: CoasterWithPoints) => {
      if (b.points !== a.points) return b.points - a.points;
      return a.name.localeCompare(b.name, undefined, { sensitivity: "base" });
    };

    // Build groups
    const groupMap = new Map<string, GroupRow>();

    const getKeyAndName = (c: CoasterWithPoints) => {
      if (mode === "parks") {
        const key = c.park?.id ?? "__none__";
        const name = c.park?.name ?? "No Park";
        return { key, name };
      } else {
        const key = c.manufacturer?.id ?? "__none__";
        const name = c.manufacturer?.name ?? "No Manufacturer";
        return { key, name };
      }
    };

    for (const c of withPoints) {
      const { key, name } = getKeyAndName(c);
      if (!groupMap.has(key)) {
        groupMap.set(key, { id: key, name, totalPoints: 0, count: 0, items: [] });
      }
      const g = groupMap.get(key)!;
      g.items.push(c);
      g.totalPoints += c.points;
      g.count += 1;
    }

    // Sort items inside each group
    for (const g of groupMap.values()) {
      g.items.sort(byPointsThenName);
    }

    // Turn into array and sort groups by total points desc, then name
    const groups: GroupRow[] = Array.from(groupMap.values()).sort((a, b) => {
      if (b.totalPoints !== a.totalPoints) return b.totalPoints - a.totalPoints;
      return a.name.localeCompare(b.name, undefined, { sensitivity: "base" });
    });

    return { groups };
  }, [state, mode]);

  if (state.status === "loading" || state.status === "idle") {
    return <div className="container">Loading…</div>;
  }

  if (state.status === "error") {
    return (
      <div className="container">
        <h1>Coasters</h1>
        <p style={{ color: "crimson" }}>Error: {state.message}</p>
      </div>
    );
  }

  // UI helpers
  const ModeToggle = () => (
    <div className="toggle">
      <button
        className={`toggle-btn ${mode === "parks" ? "active" : ""}`}
        onClick={() => setMode("parks")}
        aria-pressed={mode === "parks"}
      >
        Parks
      </button>
      <button
        className={`toggle-btn ${mode === "manufacturers" ? "active" : ""}`}
        onClick={() => setMode("manufacturers")}
        aria-pressed={mode === "manufacturers"}
      >
        Manufacturers
      </button>
    </div>
  );

  return (
    <div className="container">
      <header className="page-header">
        <h1>Coasters</h1>
        <ModeToggle />
      </header>

      <p className="subtitle">
        Grouped by <strong>{mode === "parks" ? "Parks" : "Manufacturers"}</strong> • Groups sorted by{" "}
        <em>total points</em> (desc). Coasters inside each group sorted by <em>points</em> (desc).
      </p>

      {groups.length === 0 ? (
        <p>No coasters found.</p>
      ) : (
        <div className="groups">
          {groups.map((g) => (
            <section key={g.id} className="group-card">
              <div className="group-header">
                <h2 className="group-title">{g.name}</h2>
                <div className="group-meta">
                  <span title="Total points">Total: {g.totalPoints}</span>
                  <span title="Number of coasters">• {g.count} coaster{g.count === 1 ? "" : "s"}</span>
                </div>
              </div>

              <ul className="coaster-list">
                {g.items.map((c) => (
                  <li key={c.id} className="coaster-row">
                    <div className="coaster-main">
                      <div className="coaster-name">{c.name}</div>
                      <div className="coaster-sub">
                        {mode === "parks"
                          ? (c.manufacturer?.name ?? "Unknown manufacturer")
                          : (c.park?.name ?? "Unknown park")}
                      </div>
                    </div>
                    <div className="coaster-points" title="Points">
                      {c.points}
                    </div>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      )}

      {/* Local styles (scoped to this component if using CSS Modules, otherwise move to your stylesheet) */}
      <style>{`
        .container { max-width: 900px; margin: 0 auto; padding: 24px; }
        .page-header { display: flex; align-items: center; justify-content: space-between; gap: 16px; }
        .subtitle { margin: 8px 0 16px; color: #666; }
        .toggle { display: inline-flex; border: 1px solid #ddd; border-radius: 8px; overflow: hidden; }
        .toggle-btn { padding: 8px 12px; background: white; border: none; cursor: pointer; }
        .toggle-btn + .toggle-btn { border-left: 1px solid #ddd; }
        .toggle-btn.active { background: #111; color: #fff; }
        .groups { display: grid; gap: 16px; }
        .group-card { border: 1px solid #eee; border-radius: 12px; padding: 12px; }
        .group-header { display: flex; align-items: baseline; justify-content: space-between; gap: 12px; margin-bottom: 8px; }
        .group-title { margin: 0; font-size: 1.25rem; }
        .group-meta { color: #555; display: flex; gap: 8px; }
        .coaster-list { list-style: none; padding: 0; margin: 0; }
        .coaster-row { display: flex; align-items: center; justify-content: space-between; padding: 8px 6px; border-top: 1px solid #f0f0f0; }
        .coaster-row:first-child { border-top: none; }
        .coaster-main { display: grid; }
        .coaster-name { font-weight: 600; }
        .coaster-sub { color: #777; font-size: 0.9rem; }
        .coaster-points { font-variant-numeric: tabular-nums; font-weight: 700; }
      `}</style>
    </div>
  );
}
