// src/services/githubStore.ts

// Client config no longer includes a token.
export type GitHubStoreConfig = {
  owner: string;
  repo: string;
  branch: string; // e.g. "main"
  path: string;   // e.g. "data.json"
};

// Utility: decode base64 GitHub file content returned by /api/github/read
function base64ToString(b64: string) {
  // GitHub may include newlines in "content"
  const clean = b64.replace(/\n/g, "");
  // atob is available in the browser; for SSR you'd use Buffer
  return decodeURIComponent(escape(window.atob(clean)));
}

export async function loadJson<T>(cfg: GitHubStoreConfig): Promise<{ data: T; sha: string }> {
  const url = `/api/github/read?owner=${encodeURIComponent(cfg.owner)}&repo=${encodeURIComponent(cfg.repo)}&path=${encodeURIComponent(cfg.path)}&ref=${encodeURIComponent(cfg.branch)}`;

  const res = await fetch(url);
  if (!res.ok) throw new Error(`GitHub load failed: ${res.status} ${await res.text()}`);

  const json = await res.json() as any; // shape matches GitHub contents API
  const decoded = JSON.parse(base64ToString(json.content)) as T;
  return { data: decoded, sha: json.sha };
}

export async function saveJson<T>(
  cfg: GitHubStoreConfig,
  content: T,
  prevSha: string,
  message = "Update data.json"
) {
  const res = await fetch("/api/github/save", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      owner: cfg.owner,
      repo: cfg.repo,
      path: cfg.path,
      branch: cfg.branch,
      message,
      content, // Server will JSON.stringify & base64-encode
      sha: prevSha,
    }),
  });

  if (!res.ok) throw new Error(`GitHub save failed: ${res.status} ${await res.text()}`);
  return (await res.json()) as any; // includes new sha, commit info, etc.
}
