// src/pages/Settings.tsx
import { useEffect, useState } from "react";
type GitHubCfg = { owner: string; repo: string; branch: string; path: string };
const KEY = "githubStoreConfig";

export default function Settings() {
  const [cfg, setCfg] = useState<GitHubCfg>({
    owner: "MB-26",
    repo: "coasterbook-data",
    branch: "main",
    path: "data.json",
  });

  useEffect(() => {
    const raw = localStorage.getItem(KEY);
    if (raw) setCfg(JSON.parse(raw));
  }, []);

  function save(e: React.FormEvent) {
    e.preventDefault();
    localStorage.setItem(KEY, JSON.stringify(cfg));
    alert("Saved. (Token is not stored in the browser.)");
  }

  return (
    <div className="p-6 space-y-4 max-w-xl">
      <h1 className="text-2xl font-bold">Settings</h1>
      <form onSubmit={save} className="grid gap-3">
        <input className="border p-2 rounded" placeholder="GitHub owner" value={cfg.owner}
               onChange={e => setCfg({ ...cfg, owner: e.target.value })}/>
        <input className="border p-2 rounded" placeholder="Repo name" value={cfg.repo}
               onChange={e => setCfg({ ...cfg, repo: e.target.value })}/>
        <input className="border p-2 rounded" placeholder="Branch" value={cfg.branch}
               onChange={e => setCfg({ ...cfg, branch: e.target.value })}/>
        <input className="border p-2 rounded" placeholder="Path (e.g. data.json)" value={cfg.path}
               onChange={e => setCfg({ ...cfg, path: e.target.value })}/>
        <button className="bg-black text-white px-4 py-2 rounded">Save</button>
      </form>
      <p className="text-sm text-gray-600">Data is saved via a secure serverless API (token stays on server).</p>
    </div>
  );
}
