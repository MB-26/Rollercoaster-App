// src/pages/Rankings.tsx
import { useEffect, useMemo, useState } from "react";
import { DragDropContext, Droppable, Draggable, type DropResult } from "@hello-pangea/dnd";
import type { Coaster, Rank, Park, Manufacturer } from "../types";
import type { DataFile } from "../services/dataShape";
import { loadData, saveData } from "../services/dataManager";
import { positionToPoints } from "../logic/points";

type LoadState =
  | { status: "idle" | "loading" }
  | { status: "ready"; data: DataFile; sha: string }
  | { status: "error"; message: string };

const LIST_ID = "main";

export default function Rankings() {
  const [state, setState] = useState<LoadState>({ status: "idle" });

  // load data.json from GitHub
  useEffect(() => {
    (async () => {
      setState({ status: "loading" });
      try {
        const { data, sha } = await loadData();
        if (!Array.isArray(data.ranks)) data.ranks = [];
        setState({ status: "ready", data, sha });
      } catch (e: any) {
        setState({
          status: "error",
          message:
            e?.message ??
            "Failed to load. Check Settings (owner/repo/branch/path/token) and that data.json exists.",
        });
      }
    })();
  }, []);

  // helpers
  const parks = useMemo<Park[]>(
    () => (state.status === "ready" ? state.data.parks : []),
    [state]
  );
  const mans = useMemo<Manufacturer[]>(
    () => (state.status === "ready" ? state.data.manufacturers : []),
    [state]
  );
  const coasters = useMemo<Coaster[]>(
    () => (state.status === "ready" ? state.data.coasters : []),
    [state]
  );

  const ranks = useMemo<Rank[]>(() => {
    if (state.status !== "ready") return [];
    const rs = state.data.ranks.filter((r) => r.listId === LIST_ID).slice();
    rs.sort((a, b) => a.position - b.position);
    return rs.map((r, i) => ({ ...r, position: i + 1 })); // normalize 1..N
  }, [state]);

  const rankedSet = useMemo(() => new Set(ranks.map((r) => r.coasterId)), [ranks]);
  const unranked = useMemo(
    () => coasters.filter((c) => !rankedSet.has(c.id)),
    [coasters, rankedSet]
  );

  const parkName = (id?: string) => (id ? parks.find((p) => p.id === id)?.name ?? "—" : "—");
  const manName  = (id?: string) => (id ? mans.find((m) => m.id === id)?.name ?? "—" : "—");

  async function commit(mutator: (d: DataFile) => void, message: string) {
    if (state.status !== "ready") return;
    const next: DataFile = JSON.parse(JSON.stringify(state.data));
    mutator(next);
    try {
      const res = await saveData(next, state.sha, message);
      const newSha: string = res.content?.sha ?? res.commit?.sha ?? state.sha;
      setState({ status: "ready", data: next, sha: newSha });
    } catch (e: any) {
      alert(
        `Save failed: ${e?.message || e}\nIf you edited from another device, reload to get the latest and try again.`
      );
    }
  }

  async function addToList(coasterId: string) {
    await commit((d) => {
      const current = d.ranks.filter((r) => r.listId === LIST_ID);
      const nextPos = current.length + 1;
      d.ranks.push({
        listId: LIST_ID,
        coasterId,
        position: nextPos,
        updatedAt: new Date().toISOString(),
      });
    }, `Add to rankings`);
  }

  async function removeFromList(coasterId: string) {
    await commit((d) => {
      d.ranks = d.ranks.filter(
        (r) => !(r.listId === LIST_ID && r.coasterId === coasterId)
      );
      const list = d.ranks.filter((r) => r.listId === LIST_ID).sort((a, b) => a.position - b.position);
      list.forEach((r, i) => (r.position = i + 1));
    }, `Remove from rankings`);
  }

  async function onDragEnd(result: DropResult) {
    if (!result.destination || state.status !== "ready") return;
    const fromIndex = result.source.index;
    const toIndex = result.destination.index;
    if (fromIndex === toIndex) return;

    await commit((d) => {
      const list = d.ranks.filter((r) => r.listId === LIST_ID).sort((a, b) => a.position - b.position);
      const moved = list.splice(fromIndex, 1)[0];
      list.splice(toIndex, 0, moved);
      list.forEach((r, i) => {
        r.position = i + 1;
        if (r === moved) r.updatedAt = new Date().toISOString();
      });
    }, `Reorder rankings`);
  }

  // NEW: click buttons to move up/down one position
  async function nudge(coasterId: string, direction: "up" | "down") {
    if (state.status !== "ready") return;
    const currentOrder = ranks.map((r) => r.coasterId);
    const idx = currentOrder.indexOf(coasterId);
    if (idx === -1) return;
    const toIdx = direction === "up" ? idx - 1 : idx + 1;
    if (toIdx < 0 || toIdx >= currentOrder.length) return; // already at edge

    await commit((d) => {
      const list = d.ranks.filter((r) => r.listId === LIST_ID).sort((a, b) => a.position - b.position);
      const moved = list[idx];
      const swap  = list[toIdx];
      if (!moved || !swap) return;
      // swap positions
      const tmp = moved.position;
      moved.position = swap.position;
      swap.position = tmp;
      moved.updatedAt = new Date().toISOString();
      // normalize to 1..N just in case
      list.sort((a,b) => a.position - b.position).forEach((r, i) => (r.position = i + 1));
    }, `Move ${direction}`);
  }

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

  const rankedRows = ranks
    .map((r) => {
      const c = coasters.find((x) => x.id === r.coasterId);
      return c ? { r, c } : null;
    })
    .filter(Boolean) as Array<{ r: Rank; c: Coaster }>;

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-bold">Rankings</h1>

      {unranked.length > 0 && (
        <details className="border rounded p-3">
          <summary className="cursor-pointer font-medium">
            Add coasters to list ({unranked.length} unranked)
          </summary>
          <div className="mt-3 flex flex-wrap gap-2">
            {unranked.map((c) => (
              <button
                key={c.id}
                onClick={() => addToList(c.id)}
                className="border px-2 py-1 rounded hover:bg-gray-100"
              >
                {c.name}
              </button>
            ))}
          </div>
        </details>
      )}

      <div className="overflow-x-auto">
        <DragDropContext onDragEnd={onDragEnd}>
          <Droppable droppableId="ranklist">
            {(provided) => (
              <table
                ref={provided.innerRef}
                {...provided.droppableProps}
                className="min-w-full text-sm"
              >
                <thead>
                  <tr className="text-left border-b">
                    <th className="py-2 w-10">#</th>
                    <th>Coaster</th>
                    <th>Park</th>
                    <th>Manufacturer</th>
                    <th className="w-16">Points</th>
                    <th className="w-40">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {rankedRows.map(({ r, c }, index) => {
                    const pts = positionToPoints(r.position, rankedRows.length);
                    const isTop = index === 0;
                    const isBottom = index === rankedRows.length - 1;
                    return (
                      <Draggable key={c.id} draggableId={c.id} index={index}>
                        {(drag) => (
                          <tr
                            ref={drag.innerRef}
                            {...drag.draggableProps}
                            className="border-b hover:bg-gray-50"
                          >
                            {/* Drag handle on the position cell */}
                            <td className="py-2 font-semibold select-none" {...drag.dragHandleProps}>
                              {r.position}
                            </td>
                            <td>{c.name}</td>
                            <td>{parkName(c.parkId)}</td>
                            <td>{manName(c.manufacturerId)}</td>
                            <td>{pts}</td>
                            <td className="space-x-2 py-2">
                              <button
                                className={`border px-2 py-1 rounded ${isTop ? "opacity-40 cursor-not-allowed" : "hover:bg-gray-100"}`}
                                onClick={() => !isTop && nudge(c.id, "up")}
                                disabled={isTop}
                                title="Move up"
                              >
                                ↑
                              </button>
                              <button
                                className={`border px-2 py-1 rounded ${isBottom ? "opacity-40 cursor-not-allowed" : "hover:bg-gray-100"}`}
                                onClick={() => !isBottom && nudge(c.id, "down")}
                                disabled={isBottom}
                                title="Move down"
                              >
                                ↓
                              </button>
                              <button
                                onClick={() => removeFromList(c.id)}
                                className="border px-2 py-1 rounded hover:bg-gray-100"
                                title="Remove from list"
                              >
                                Remove
                              </button>
                            </td>
                          </tr>
                        )}
                      </Draggable>
                    );
                  })}
                  {provided.placeholder}
                </tbody>
              </table>
            )}
          </Droppable>
        </DragDropContext>
      </div>

      <p className="text-xs text-gray-600">
        Drag rows by the position number, or use ↑/↓ to nudge. Changes auto-save to GitHub.
      </p>
      <p className="text-xs text-gray-500">
        Points use a hinged system: bottom = 1, linear rise until the half way point, then exponential towards the top.
      </p>
    </div>
  );
}
