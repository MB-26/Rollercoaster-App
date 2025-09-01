import type { DataFile } from "./dataShape";
import { loadJson, saveJson, type GitHubStoreConfig } from "./githubStore";

const KEY = "githubStoreConfig";

export async function getConfig(): Promise<GitHubStoreConfig | null> {
  const raw = localStorage.getItem(KEY);
  return raw ? JSON.parse(raw) : null;
}

export async function loadData(): Promise<{ data: DataFile; sha: string }> {
  const cfg = await getConfig();
  if (!cfg) throw new Error("Missing GitHub settings. Go to Settings first.");
  return await loadJson<DataFile>(cfg);
}

export async function saveData(next: DataFile, prevSha: string, message?: string) {
  const cfg = await getConfig();
  if (!cfg) throw new Error("Missing GitHub settings. Go to Settings first.");
  return await saveJson<DataFile>(cfg, next, prevSha, message);
}
