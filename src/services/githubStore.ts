// src/services/githubStore.ts

export type GitHubStoreConfig = {
  owner: string;
  repo: string;
  branch: string; // e.g. "main"
  path: string;   // e.g. "data.json"
};

// Safer base64 → UTF-8 in the browser
function base64ToUtf8(b64: string) {
  const clean = b64.replace(/\n/g, "");
  const bin = atob(clean);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return new TextDecoder().decode(bytes);
}

export async function loadJson<T>(cfg: GitHubStoreConfig): Promise<{ data: T; sha: string }> {
  const url =
    `/api/github/read` +
    `?owner=${encodeURIComponent(cfg.owner)}` +
    `&repo=${encodeURIComponent(cfg.repo)}` +
    `&path=${encodeURIComponent(cfg.path)}` +
    `&ref=${encodeURIComponent(cfg.branch)}`;

  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`GitHub load failed: ${res.status} ${text || res.statusText}`);
  }

  // This may be our server shape OR the raw GitHub "contents" shape
  const body: any = await res.json();

  // 1) New server route shape: { ok: true, json?: any, raw?: string, meta?: { sha } }
  if (body && body.ok === true) {
    // Prefer parsed JSON if provided
    if (body.json != null) {
      return { data: body.json as T, sha: body.meta?.sha ?? "" };
    }
    // Fallback to raw string -> parse if JSON
    if (typeof body.raw === "string") {
      try {
        return { data: JSON.parse(body.raw) as T, sha: body.meta?.sha ?? "" };
      } catch {
        // If your file isn't JSON, still return the string
        return { data: body.raw as unknown as T, sha: body.meta?.sha ?? "" };
      }
    }
    throw new Error("Read API returned ok=true but no data (json/raw missing).");
  }

  // 2) Legacy GitHub "contents" API shape (if your client ever hits GitHub directly)
  // { content: "base64...", encoding: "base64", sha: "..." }
  if (typeof body?.content === "string") {
    const decodedText = base64ToUtf8(body.content);
    try {
      return { data: JSON.parse(decodedText) as T, sha: body.sha ?? "" };
    } catch {
      return { data: decodedText as unknown as T, sha: body.sha ?? "" };
    }
  }

  // 3) Error payload or unexpected shape
  const msg =
    body?.error ||
    body?.statusText ||
    (typeof body === "string" ? body : "Unknown error reading data");
  throw new Error(msg);
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

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`GitHub save failed: ${res.status} ${text || res.statusText}`);
  }
  return (await res.json()) as any; // should include new sha/commit info
}
