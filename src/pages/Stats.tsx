import { useEffect, useMemo, useState } from "react";
import type { DataFile } from "../services/dataShape";
import type { Coaster, Manufacturer, Park, Rank } from "../types";
import { loadData } from "../services/dataManager";
import { positionToPoints } from "../logic/points";

type LoadState =
  | { status: "idle" | "loading" }
  | { status: "ready"; data: DataFile }
  | { status: "error"; message: string };

type SortKey = "count" | "totalPoints" | "avg" | "top3Avg";
type SortDir = "asc" | "desc";

type Row = {
  id: string;
  name: string;
  totalPoints: number;
  count: number;
  avg: number;
  top3Avg: number;
};

export default function Stats() {
  const [state, setState] = useState<LoadState>({ status: "idle" });
  const [sortKey, setSortKey] = useState<SortKey>("totalPoints");
  const [sortDir, setSortDir] = useState<SortDir>("desc");

  useEffect(() => {
    (async () => {
      setState({ status: "loading" });
      try {
        const { data } = await loadData();
        if (!Array.isArray((data as any).ranks)) (data as any).ranks = [];
        setState({ status: "ready", data });
      } catch (e: any) {
        setState({
          status: "error",
          message: e?.message ?? "Unknown error loading data",
        });
      }
    })();
  }, []);

  const sortLabel = useMemo(() => {
    const labelMap: Record<SortKey, string> = {
      count: "# Coasters",
      totalPoints: "Total Points",
      avg: "Average Points",
      top3Avg: "Top 3 Average",
    };
    return `${labelMap[sortKey]} (${sortDir})`;
  }, [sortKey, sortDir]);

  const { parkRows, mfrRows, totalCoasters } = useMemo(() => {
    if (state.status !== "ready") {
      return { parkRows: [] as Row[], mfrRows: [] as Row[], totalCoasters: 0 };
    }

    const data = state.data;

    const coasters = (data.coasters ?? []) as Coaster[];
    const parks = (data.parks ?? []) as Park[];
    const manufacturers = (data.manufacturers ?? []) as Manufacturer[];
    const ranks = (data.ranks ?? []) as Rank[];

    // Build points map from ranks (assuming ranks is an ordered list)
    const pointsByCoaster: Record<string, number> = {};
    ranks.forEach((r, i) => {
      // Rank may be { coasterId, position } or just ordered list.
      const coasterId = (r as any).coasterId ?? (r as any).id ?? (r as any);
      const position = (r as any).position ?? i + 1;
      const pts = positionToPoints(position, ranks.length);
      if (coasterId) pointsByCoaster[coasterId] = pts;
    });

    // Group coaster points by park & manufacturer
    const byPark: Record<
      string,
      { name: string; points: number[] }
    > = {};
    const byMfr: Record<
      string,
      { name: string; points: number[] }
    > = {};

    for (const c of coasters) {
      const id = (c as any).id ?? (c as any)._id ?? (c as any).coasterId;
      if (!id) continue;
      const pts = pointsByCoaster[id] ?? 0;

      const parkId = (c as any).parkId ?? (c as any).park ?? (c as any).parkID;
      const mfrId =
        (c as any).manufacturerId ??
        (c as any).manufacturer ??
        (c as any).manufacturerID;

      // Resolve names (fallback to IDs if not found)
      const parkName =
        parks.find((p: any) => p.id === parkId)?.name ?? String(parkId ?? "Unknown Park");
      const mfrName =
        manufacturers.find((m: any) => m.id === mfrId)?.name ??
        String(mfrId ?? "Unknown Manufacturer");

      if (parkId != null) {
        if (!byPark[parkId]) byPark[parkId] = { name: parkName, points: [] };
        byPark[parkId].points.push(pts);
      }

      if (mfrId != null) {
        if (!byMfr[mfrId]) byMfr[mfrId] = { name: mfrName, points: [] };
        byMfr[mfrId].points.push(pts);
      }
    }

    const toRows = (obj: Record<string, { name: string; points: number[] }>): Row[] => {
      return Object.entries(obj).map(([id, { name, points }]) => {
        const count = points.length;
        const totalPoints = points.reduce((a, b) => a + b, 0);
        const avg = count > 0 ? totalPoints / count : 0;

        // Top 3 Average: sum of best three (or fewer), divided by 3 ALWAYS
        const top3 = [...points].sort((a, b) => b - a).slice(0, 3);
        const top3Sum = top3.reduce((a, b) => a + b, 0);
        const top3Avg = top3Sum / 3;

        return { id, name, totalPoints, count, avg, top3Avg };
      });
    };

    const parkRows = toRows(byPark);
    const mfrRows = toRows(byMfr);
    const totalCoasters = Object.keys(pointsByCoaster).length;

    return { parkRows, mfrRows, totalCoasters };
  }, [state]);

  const sortedParkRows = useMemo(() => {
    return sortRows(parkRows, sortKey, sortDir);
  }, [parkRows, sortKey, sortDir]);

  const sortedMfrRows = useMemo(() => {
    return sortRows(mfrRows, sortKey, sortDir);
  }, [mfrRows, sortKey, sortDir]);

  if (state.status === "loading" || state.status === "idle") {
    return <div className="p-4">Loading stats…</div>;
  }
  if (state.status === "error") {
    return <div className="p-4 text-red-600">Error: {state.message}</div>;
  }

  return (
    <div className="p-4 space-y-6">
      <header className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
        <h1 className="text-2xl font-semibold">
          Stats — Sorted by {sortLabel}
        </h1>

        <div className="flex gap-2 items-center">
          <label className="text-sm">Sort by:</label>
          <select
            value={sortKey}
            onChange={(e) => setSortKey(e.target.value as SortKey)}
            className="border rounded px-2 py-1"
          >
            <option value="count"># Coasters</option>
            <option value="totalPoints">Total Points</option>
            <option value="avg">Average Points</option>
            <option value="top3Avg">Top 3 Average</option>
          </select>

          <button
            onClick={() => setSortDir((d) => (d === "asc" ? "desc" : "asc"))}
            className="border rounded px-3 py-1"
            title="Toggle sort direction"
          >
            {sortDir === "asc" ? "Asc ↑" : "Desc ↓"}
          </button>
        </div>
      </header>

      <Summary totalCoasters={totalCoasters} />

      <section>
        <h2 className="text-xl font-semibold mb-2">Parks</h2>
        <DataTable rows={sortedParkRows} />
      </section>

      <section>
        <h2 className="text-xl font-semibold mb-2">Manufacturers</h2>
        <DataTable rows={sortedMfrRows} />
      </section>
    </div>
  );
}

function sortRows(rows: Row[], key: SortKey, dir: SortDir) {
  const mul = dir === "asc" ? 1 : -1;
  return [...rows].sort((a, b) => {
    const av = a[key];
    const bv = b[key];
    if (av < bv) return -1 * mul;
    if (av > bv) return 1 * mul;
    // tie-breakers: totalPoints then name
    if (a.totalPoints < b.totalPoints) return -1 * mul;
    if (a.totalPoints > b.totalPoints) return 1 * mul;
    return a.name.localeCompare(b.name) * mul;
  });
}

function Summary({ totalCoasters }: { totalCoasters: number }) {
  return (
    <div className="border rounded p-3 bg-gray-50 flex gap-6 text-sm">
      <div>
        <div className="text-gray-500">Total ranked coasters</div>
        <div className="text-lg font-medium">{totalCoasters}</div>
      </div>
    </div>
  );
}

function DataTable({ rows }: { rows: Row[] }) {
  return (
    <div className="overflow-x-auto">
      <table className="min-w-[680px] w-full border-collapse">
        <thead>
          <tr className="bg-gray-100 text-left">
            <Th>Name</Th>
            <Th># Coasters</Th>
            <Th>Total Points</Th>
            <Th>Average Points</Th>
            <Th>Top 3 Average</Th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.id} className="border-t">
              <Td className="font-medium">{r.name}</Td>
              <Td>{r.count}</Td>
              <Td>{fmt(r.totalPoints)}</Td>
              <Td>{fmt(r.avg)}</Td>
              <Td>{fmt(r.top3Avg)}</Td>
            </tr>
          ))}
          {rows.length === 0 && (
            <tr>
              <td className="py-6 text-center text-gray-500" colSpan={5}>
                No data yet.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

function Th({ children }: { children: React.ReactNode }) {
  return <th className="px-3 py-2 text-sm font-semibold border-b">{children}</th>;
}
function Td({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return <td className={`px-3 py-2 text-sm ${className}`}>{children}</td>;
}

function fmt(n: number) {
  // Points are usually integers, but averages can be fractional.
  // Keep 2 dp for readability, strip trailing zeros.
  const s = n.toFixed(2);
  return s.replace(/\.00$/, "").replace(/(\.\d)0$/, "$1");
}
