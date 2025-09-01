import { useEffect, useState } from "react";
import type { GitHubStoreConfig } from "../services/githubStore";

const KEY = "githubStoreConfig";

export default function Settings() {
  const [cfg, setCfg] = useState<GitHubStoreConfig>({
    owner: "MB-26",
    repo: "coasterbook-data",
    branch: "main",
    path: "data.json",
    token: "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",
  });

  useEffect(() => {
    const raw = localStorage.getItem(KEY);
    if (raw) setCfg(JSON.parse(raw));
  }, []);

  function save(e: React.FormEvent) {
    e.preventDefault();
    localStorage.setItem(KEY, JSON.stringify(cfg));
    alert("Saved. Your token stays only on this device.");
  }

  return (
    <div className="p-6 space-y-4 max-w-xl">
      <h1 className="text-2xl font-bold">Settings</h1>
      <form onSubmit={save} className="grid gap-3">
        <input className="border p-2 rounded" placeholder="GitHub owner (username)"
          value={cfg.owner} onChange={e => setCfg({ ...cfg, owner: e.target.value })} />
        <input className="border p-2 rounded" placeholder="Repo name"
          value={cfg.repo} onChange={e => setCfg({ ...cfg, repo: e.target.value })} />
        <input className="border p-2 rounded" placeholder="Branch"
          value={cfg.branch} onChange={e => setCfg({ ...cfg, branch: e.target.value })} />
        <input className="border p-2 rounded" placeholder="Path to JSON (e.g. data.json)"
          value={cfg.path} onChange={e => setCfg({ ...cfg, path: e.target.value })} />
        <input className="border p-2 rounded" placeholder="Fine-grained PAT (write: contents)"
          value={cfg.token} onChange={e => setCfg({ ...cfg, token: e.target.value })} />
        <button className="bg-black text-white px-4 py-2 rounded">Save</button>
      </form>
      <p className="text-sm text-gray-600">
        Tip: Create a fine-grained PAT limited to this repo with “Repository contents: Read & write”.
      </p>
    </div>
  );
}
