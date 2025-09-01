import { useEffect, useState } from "react";
import type { DataFile } from "../services/dataShape";
import type { Coaster, Manufacturer, Park, Rank } from "../types";
import { loadData } from "../services/dataManager";
import { positionToPoints } from "../logic/points";

type LoadState =
  | { status: "idle" | "loading" }
  | { status: "ready"; data: DataFile }
  | { status: "error"; message: string };

const LIST_ID = "main";

type Row = { id: string; name: string; totalPoints: number; count: number; avg: number };

export default function Stats() {
  const [state, setState] = useState<LoadState>({ status: "idle" });

  useEffect(() => {
    (async () => {
      setState({ status: "loading" });
      try {
        const { data } = await loadData();
        if (!Array.isArray(data.ranks)) data.ranks = [];
        setState({ status: "ready", data });
      } catch (e: any) {
        setState({
          status: "error",
          message:
            e?.message ??
            "Failed to load. Check Settings and that data.json exists.",
        });
      }
    })();
  }, []);

  if (state.status !== "ready") {
    return (
      <div className="p-6">
        {state.status === "error" ? (
          <p className="text-red-600">{state.message}</p>
        ) : (
          <p>Loading…</p>
        )}
      </div>
    );
  }

  const data = state.data;
  const parks = data.parks as Park[];
  const mans = data.manufacturers as Manufacturer[];
  const coasters = data.coasters as Coaster[];
  const ranksAll = (data.ranks as Rank[]).filter((r) => r.listId === LIST_ID);

  // Normalize ranks to 1..N and compute points per coaster
  const ranks = [...ranksAll].sort((a, b) => a.position - b.position)
    .map((r, i) => ({ ...r, position: i + 1 }));
  const pointsByCoaster = new Map<string, number>();
  for (const r of ranks) {
    pointsByCoaster.set(r.coasterId, positionToPoints(r.position, ranks.length));
  }

  // Overall counts
  const totalCoasters = coasters.length;
  const rankedCount = ranks.length;
  const unrankedCount = Math.max(0, totalCoasters - rankedCount);

  const parkName = (id?: string) =>
    id ? parks.find((p) => p.id === id)?.name ?? "—" : "—";
  const manName = (id?: string) =>
    id ? mans.find((m) => m.id === id)?.name ?? "Unassigned" : "Unassigned";

  // Aggregate by Park
  const parksAgg = new Map<string, Row>();
  for (const c of coasters) {
    const pid = c.parkId;
    const key = pid;
    const name = parkName(pid);
    const pts = pointsByCoaster.get(c.id) ?? 0;
    const row = parksAgg.get(key) ?? { id: key, name, totalPoints: 0, count: 0, avg: 0 };
    row.totalPoints += pts;
    row.count += 1;
    parksAgg.set(key, row);
  }
  for (const row of parksAgg.values()) {
    row.avg = row.count ? row.totalPoints / row.count : 0;
  }

  // Aggregate by Manufacturer (include "Unassigned" bucket)
  const mansAgg = new Map<string, Row>();
  for (const c of coasters) {
    const mid = c.manufacturerId ?? "__unassigned__";
    const name = c.manufacturerId ? manName(c.manufacturerId) : "Unassigned";
    const pts = pointsByCoaster.get(c.id) ?? 0;
    const row = mansAgg.get(mid) ?? { id: mid, name, totalPoints: 0, count: 0, avg: 0 };
    row.totalPoints += pts;
    row.count += 1;
    mansAgg.set(mid, row);
  }
  for (const row of mansAgg.values()) {
    row.avg = row.count ? row.totalPoints / row.count : 0;
  }

  const sortRows = (rows: Row[]) =>
    rows.sort((a, b) =>
      b.totalPoints !== a.totalPoints
        ? b.totalPoints - a.totalPoints
        : a.name.localeCompare(b.name)
    );

  const parkRows = sortRows(Array.from(parksAgg.values()));
  const manRows = sortRows(Array.from(mansAgg.values()));

  const fmt = (n: number) => n.toLocaleString(undefined, { maximumFractionDigits: 2 });

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-bold">Stats</h1>

      {/* Summary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="border rounded-xl p-4">
          <div className="text-sm text-gray-500">Total coasters</div>
          <div className="text-2xl font-semibold">{totalCoasters}</div>
        </div>
        <div className="border rounded-xl p-4">
          <div className="text-sm text-gray-500">Ranked</div>
          <div className="text-2xl font-semibold">{rankedCount}</div>
        </div>
        <div className="border rounded-xl p-4">
          <div className="text-sm text-gray-500">Unranked</div>
          <div className="text-2xl font-semibold">{unrankedCount}</div>
        </div>
      </div>

      {/* Parks table */}
      <section>
        <h2 className="text-xl font-semibold mb-2">Parks by total points</h2>
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="text-left border-b">
                <th className="py-2">Park</th>
                <th className="w-28">Coasters</th>
                <th className="w-32">Total points</th>
                <th className="w-40">Avg points / coaster</th>
              </tr>
            </thead>
            <tbody>
              {parkRows.map((row) => (
                <tr key={row.id} className="border-b">
                  <td className="py-2">{row.name}</td>
                  <td>{row.count}</td>
                  <td>{fmt(row.totalPoints)}</td>
                  <td>{fmt(row.avg)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Manufacturers table */}
      <section>
        <h2 className="text-xl font-semibold mb-2">Manufacturers by total points</h2>
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="text-left border-b">
                <th className="py-2">Manufacturer</th>
                <th className="w-28">Coasters</th>
                <th className="w-32">Total points</th>
                <th className="w-40">Avg points / coaster</th>
              </tr>
            </thead>
            <tbody>
              {manRows.map((row) => (
                <tr key={row.id} className="border-b">
                  <td className="py-2">{row.name}</td>
                  <td>{row.count}</td>
                  <td>{fmt(row.totalPoints)}</td>
                  <td>{fmt(row.avg)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <p className="text-xs text-gray-500">
        Points use a compressed power schedule: bottom = 1; top grows with list size (≈25 for 10, higher for larger lists).
      </p>
    </div>
  );
}
