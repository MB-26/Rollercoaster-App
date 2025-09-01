import { useEffect, useMemo, useState } from "react";
import { v4 as uuid } from "uuid";
import type { Park, Manufacturer, Coaster } from "../types";
import type { DataFile } from "../services/dataShape";
import { loadData, saveData } from "../services/dataManager";

type LoadState =
  | { status: "idle" | "loading" }
  | { status: "ready"; data: DataFile; sha: string }
  | { status: "error"; message: string };

export default function DataEntry() {
  const [state, setState] = useState<LoadState>({ status: "idle" });

  // form state
  const [parkName, setParkName] = useState("");
  const [manName, setManName] = useState("");
  const [coasterForm, setCoasterForm] = useState({
    name: "",
    parkId: "",
    manufacturerId: "",
    notes: "",
  });

  // load from GitHub on mount
  useEffect(() => {
    (async () => {
      setState({ status: "loading" });
      try {
        const { data, sha } = await loadData();
        setState({ status: "ready", data, sha });
      } catch (e: any) {
        setState({
          status: "error",
          message:
            e?.message ??
            "Failed to load. Did you save your GitHub Settings and create data.json?",
        });
      }
    })();
  }, []);

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

  // helper: make a deep copy, apply mutation, save to GitHub, update state with new sha
  async function commit(mutator: (d: DataFile) => void, message: string) {
    if (state.status !== "ready") return;
    const next: DataFile = JSON.parse(JSON.stringify(state.data));
    mutator(next);
    try {
      const res = await saveData(next, state.sha, message);
      const newSha: string = res.content.sha ?? res.commit.sha; // GitHub returns a new sha
      setState({ status: "ready", data: next, sha: newSha });
    } catch (e: any) {
      alert(
        `Save failed: ${e?.message || e}\n` +
          `Tip: If you edited from another device, reload this page to get the latest and try again.`
      );
    }
  }

  async function addPark(e: React.FormEvent) {
    e.preventDefault();
    const name = parkName.trim();
    if (!name) return;
    await commit(
      (d) => {
        // dedupe by case-insensitive name
        if (!d.parks.some((p) => p.name.toLowerCase() === name.toLowerCase())) {
          d.parks.push({ id: uuid(), name });
        }
      },
      `Add park: ${name}`
    );
    setParkName("");
  }

  async function addMan(e: React.FormEvent) {
    e.preventDefault();
    const name = manName.trim();
    if (!name) return;
    await commit(
      (d) => {
        if (
          !d.manufacturers.some(
            (m) => m.name.toLowerCase() === name.toLowerCase()
          )
        ) {
          d.manufacturers.push({ id: uuid(), name });
        }
      },
      `Add manufacturer: ${name}`
    );
    setManName("");
  }

  async function addCoaster(e: React.FormEvent) {
    e.preventDefault();
    const name = coasterForm.name.trim();
    const parkId = coasterForm.parkId;
    const manufacturerId = coasterForm.manufacturerId || undefined;
    const notes = coasterForm.notes.trim() || undefined;

    if (!name || !parkId) {
      alert("Coaster name and Park are required.");
      return;
    }

    await commit(
      (d) => {
        // prevent duplicate coaster (by name at same park)
        const exists = d.coasters.some(
          (c) =>
            c.name.toLowerCase() === name.toLowerCase() && c.parkId === parkId
        );
        if (!exists) {
          d.coasters.push({
            id: uuid(),
            name,
            parkId,
            manufacturerId,
            notes,
          });
        }
      },
      `Add coaster: ${name}`
    );

    setCoasterForm({ name: "", parkId: "", manufacturerId: "", notes: "" });
  }

  if (state.status === "loading" || state.status === "idle") {
    return (
      <div className="p-6">
        <p>Loading data from GitHub…</p>
      </div>
    );
  }

  if (state.status === "error") {
    return (
      <div className="p-6 space-y-3">
        <h1 className="text-2xl font-bold">Data Entry</h1>
        <p className="text-red-600">{state.message}</p>
        <p className="text-sm text-gray-600">
          Go to <strong>Settings</strong>, enter your GitHub owner/repo/branch,
          the path to <code>data.json</code>, and your fine-grained token. Then
          return here.
        </p>
      </div>
    );
  }

  // ready
  return (
    <div className="p-6 space-y-8 max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold">Data Entry</h1>

      {/* Add Park */}
      <section>
        <h2 className="text-xl font-semibold mb-2">Add Park</h2>
        <form onSubmit={addPark} className="flex gap-2">
          <input
            className="border p-2 rounded flex-1"
            placeholder="Park name"
            value={parkName}
            onChange={(e) => setParkName(e.target.value)}
          />
          <button className="bg-black text-white px-4 py-2 rounded">Add</button>
        </form>
        {parks.length > 0 && (
          <ul className="mt-2 list-disc ml-6">
            {parks.map((p) => (
              <li key={p.id}>{p.name}</li>
            ))}
          </ul>
        )}
      </section>

      {/* Add Manufacturer */}
      <section>
        <h2 className="text-xl font-semibold mb-2">Add Manufacturer</h2>
        <form onSubmit={addMan} className="flex gap-2">
          <input
            className="border p-2 rounded flex-1"
            placeholder="Manufacturer name"
            value={manName}
            onChange={(e) => setManName(e.target.value)}
          />
          <button className="bg-black text-white px-4 py-2 rounded">Add</button>
        </form>
        {mans.length > 0 && (
          <ul className="mt-2 list-disc ml-6">
            {mans.map((m) => (
              <li key={m.id}>{m.name}</li>
            ))}
          </ul>
        )}
      </section>

      {/* Add Coaster */}
      <section>
        <h2 className="text-xl font-semibold mb-2">Add Coaster</h2>
        <form onSubmit={addCoaster} className="grid gap-2">
          <input
            className="border p-2 rounded"
            placeholder="Coaster name"
            value={coasterForm.name}
            onChange={(e) =>
              setCoasterForm((f) => ({ ...f, name: e.target.value }))
            }
          />

          {/* Park dropdown */}
          <select
            className="border p-2 rounded"
            value={coasterForm.parkId}
            onChange={(e) =>
              setCoasterForm((f) => ({ ...f, parkId: e.target.value }))
            }
          >
            <option value="">Select Park</option>
            {parks.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>

          {/* Manufacturer dropdown */}
          <select
            className="border p-2 rounded"
            value={coasterForm.manufacturerId}
            onChange={(e) =>
              setCoasterForm((f) => ({ ...f, manufacturerId: e.target.value }))
            }
          >
            <option value="">Manufacturer (optional)</option>
            {mans.map((m) => (
              <option key={m.id} value={m.id}>
                {m.name}
              </option>
            ))}
          </select>

          <textarea
            className="border p-2 rounded"
            placeholder="Notes (optional)"
            value={coasterForm.notes}
            onChange={(e) =>
              setCoasterForm((f) => ({ ...f, notes: e.target.value }))
            }
          />

          <button className="bg-black text-white px-4 py-2 rounded">
            Add Coaster
          </button>
        </form>

        {coasters.length > 0 && (
          <ul className="mt-2 list-disc ml-6">
            {coasters.map((c) => (
              <li key={c.id}>
                {c.name} —{" "}
                {parks.find((p) => p.id === c.parkId)?.name ?? "Unknown park"}{" "}
                (
                {c.manufacturerId
                  ? mans.find((m) => m.id === c.manufacturerId)?.name ?? "Unknown manufacturer"
                  : "No manufacturer"}
                )
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}