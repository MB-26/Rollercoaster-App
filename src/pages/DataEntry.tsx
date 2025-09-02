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

  // edit state
  const [editing, setEditing] = useState<{
    parkId?: string;
    manId?: string;
    coasterId?: string;
  }>({});

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
      const newSha: string = res.content?.sha ?? res.commit?.sha;
      setState({ status: "ready", data: next, sha: newSha });
    } catch (e: any) {
      alert(
        `Save failed: ${e?.message || e}\n` +
          `Tip: If you edited from another device, reload this page to get the latest and try again.`
      );
    }
  }

  // ------- Parks -------
  function startEditPark(p: Park) {
    setEditing({ parkId: p.id });
    setParkName(p.name);
  }
  function cancelEditPark() {
    setEditing((e) => ({ ...e, parkId: undefined }));
    setParkName("");
  }

  async function submitPark(e: React.FormEvent) {
    e.preventDefault();
    const name = parkName.trim();
    if (!name) return;

    const editingId = editing.parkId;

    // check collision (ignore the one we’re editing)
    const nameTaken = parks.some(
      (p) =>
        p.name.toLowerCase() === name.toLowerCase() &&
        (!editingId || p.id !== editingId)
    );
    if (nameTaken) {
      alert("A park with that name already exists.");
      return;
    }

    if (!editingId) {
      // Add
      await commit(
        (d) => {
          d.parks.push({ id: uuid(), name });
        },
        `Add park: ${name}`
      );
    } else {
      // Update
      await commit(
        (d) => {
          const idx = d.parks.findIndex((p) => p.id === editingId);
          if (idx >= 0) d.parks[idx] = { ...d.parks[idx], name };
        },
        `Update park: ${name}`
      );
    }
    setParkName("");
    setEditing((e2) => ({ ...e2, parkId: undefined }));
  }

  // ------- Manufacturers -------
  function startEditMan(m: Manufacturer) {
    setEditing({ manId: m.id });
    setManName(m.name);
  }
  function cancelEditMan() {
    setEditing((e) => ({ ...e, manId: undefined }));
    setManName("");
  }

  async function submitMan(e: React.FormEvent) {
    e.preventDefault();
    const name = manName.trim();
    if (!name) return;

    const editingId = editing.manId;

    const nameTaken = mans.some(
      (m) =>
        m.name.toLowerCase() === name.toLowerCase() &&
        (!editingId || m.id !== editingId)
    );
    if (nameTaken) {
      alert("A manufacturer with that name already exists.");
      return;
    }

    if (!editingId) {
      await commit(
        (d) => {
          d.manufacturers.push({ id: uuid(), name });
        },
        `Add manufacturer: ${name}`
      );
    } else {
      await commit(
        (d) => {
          const idx = d.manufacturers.findIndex((m) => m.id === editingId);
          if (idx >= 0) d.manufacturers[idx] = { ...d.manufacturers[idx], name };
        },
        `Update manufacturer: ${name}`
      );
    }
    setManName("");
    setEditing((e2) => ({ ...e2, manId: undefined }));
  }

  // ------- Coasters -------
  function startEditCoaster(c: Coaster) {
    setEditing({ coasterId: c.id });
    setCoasterForm({
      name: c.name ?? "",
      parkId: c.parkId ?? "",
      manufacturerId: c.manufacturerId ?? "",
      notes: c.notes ?? "",
    });
  }
  function cancelEditCoaster() {
    setEditing((e) => ({ ...e, coasterId: undefined }));
    setCoasterForm({ name: "", parkId: "", manufacturerId: "", notes: "" });
  }

  async function submitCoaster(e: React.FormEvent) {
    e.preventDefault();
    const name = coasterForm.name.trim();
    const parkId = coasterForm.parkId;
    const manufacturerId = coasterForm.manufacturerId || undefined;
    const notes = coasterForm.notes.trim() || undefined;

    if (!name || !parkId) {
      alert("Coaster name and Park are required.");
      return;
    }

    const editingId = editing.coasterId;

    // prevent duplicate coaster (same name at same park), excluding the one being edited
    const exists = coasters.some(
      (c) =>
        c.name.toLowerCase() === name.toLowerCase() &&
        c.parkId === parkId &&
        (!editingId || c.id !== editingId)
    );
    if (exists) {
      alert("A coaster with that name already exists at the selected park.");
      return;
    }

    if (!editingId) {
      await commit(
        (d) => {
          d.coasters.push({
            id: uuid(),
            name,
            parkId,
            manufacturerId,
            notes,
          });
        },
        `Add coaster: ${name}`
      );
    } else {
      await commit(
        (d) => {
          const idx = d.coasters.findIndex((c) => c.id === editingId);
          if (idx >= 0) {
            d.coasters[idx] = {
              ...d.coasters[idx],
              name,
              parkId,
              manufacturerId,
              notes,
            };
          }
        },
        `Update coaster: ${name}`
      );
    }

    setCoasterForm({ name: "", parkId: "", manufacturerId: "", notes: "" });
    setEditing((e2) => ({ ...e2, coasterId: undefined }));
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

      {/* Parks */}
      <section>
        <h2 className="text-xl font-semibold mb-2">Park</h2>
        <form onSubmit={submitPark} className="flex gap-2">
          <input
            className="border p-2 rounded flex-1"
            placeholder="Park name"
            value={parkName}
            onChange={(e) => setParkName(e.target.value)}
          />
          {editing.parkId ? (
            <>
              <button className="bg-black text-white px-4 py-2 rounded">
                Save
              </button>
              <button
                type="button"
                onClick={cancelEditPark}
                className="px-4 py-2 rounded border"
              >
                Cancel
              </button>
            </>
          ) : (
            <button className="bg-black text-white px-4 py-2 rounded">
              Add
            </button>
          )}
        </form>

        {parks.length > 0 && (
          <ul className="mt-2 ml-0">
            {parks.map((p) => (
              <li
                key={p.id}
                className="flex items-center justify-between border-b py-1"
              >
                <span>
                  {p.name}
                  {editing.parkId === p.id && (
                    <span className="ml-2 text-xs text-blue-600">(editing)</span>
                  )}
                </span>
                <button
                  className="text-sm px-2 py-1 border rounded"
                  onClick={() => startEditPark(p)}
                >
                  Edit
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Manufacturers */}
      <section>
        <h2 className="text-xl font-semibold mb-2">Manufacturer</h2>
        <form onSubmit={submitMan} className="flex gap-2">
          <input
            className="border p-2 rounded flex-1"
            placeholder="Manufacturer name"
            value={manName}
            onChange={(e) => setManName(e.target.value)}
          />
          {editing.manId ? (
            <>
              <button className="bg-black text-white px-4 py-2 rounded">
                Save
              </button>
              <button
                type="button"
                onClick={cancelEditMan}
                className="px-4 py-2 rounded border"
              >
                Cancel
              </button>
            </>
          ) : (
            <button className="bg-black text-white px-4 py-2 rounded">
              Add
            </button>
          )}
        </form>

        {mans.length > 0 && (
          <ul className="mt-2 ml-0">
            {mans.map((m) => (
              <li
                key={m.id}
                className="flex items-center justify-between border-b py-1"
              >
                <span>
                  {m.name}
                  {editing.manId === m.id && (
                    <span className="ml-2 text-xs text-blue-600">(editing)</span>
                  )}
                </span>
                <button
                  className="text-sm px-2 py-1 border rounded"
                  onClick={() => startEditMan(m)}
                >
                  Edit
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Coasters */}
      <section>
        <h2 className="text-xl font-semibold mb-2">Coaster</h2>
        <form onSubmit={submitCoaster} className="grid gap-2">
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
              setCoasterForm((f) => ({
                ...f,
                manufacturerId: e.target.value,
              }))
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

          <div className="flex gap-2">
            {editing.coasterId ? (
              <>
                <button className="bg-black text-white px-4 py-2 rounded">
                  Save
                </button>
                <button
                  type="button"
                  onClick={cancelEditCoaster}
                  className="px-4 py-2 rounded border"
                >
                  Cancel
                </button>
              </>
            ) : (
              <button className="bg-black text-white px-4 py-2 rounded">
                Add Coaster
              </button>
            )}
          </div>
        </form>

        {coasters.length > 0 && (
          <ul className="mt-2 ml-0">
            {coasters.map((c) => {
              const parkName =
                parks.find((p) => p.id === c.parkId)?.name ?? "Unknown park";
              const manName =
                c.manufacturerId
                  ? mans.find((m) => m.id === c.manufacturerId)?.name ??
                    "Unknown manufacturer"
                  : "No manufacturer";
              return (
                <li
                  key={c.id}
                  className="flex items-center justify-between border-b py-1"
                >
                  <span>
                    {c.name} — {parkName} ({manName})
                    {editing.coasterId === c.id && (
                      <span className="ml-2 text-xs text-blue-600">
                        (editing)
                      </span>
                    )}
                  </span>
                  <button
                    className="text-sm px-2 py-1 border rounded"
                    onClick={() => startEditCoaster(c)}
                  >
                    Edit
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}
