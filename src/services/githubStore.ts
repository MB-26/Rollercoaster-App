// Minimal GitHub JSON store for personal use (no backend).
// Reads/writes a single JSON file in a private repo via GitHub API.

export type GitHubStoreConfig = {
    owner: string;           // your GitHub username
    repo: string;            // "coasterbook-data"
    branch: string;          // e.g. "main"
    path: string;            // "data.json"
    token: string;           // fine-grained PAT
  };
  
  export async function loadJson<T>(cfg: GitHubStoreConfig): Promise<{ data: T; sha: string }> {
    const res = await fetch(
      `https://api.github.com/repos/${cfg.owner}/${cfg.repo}/contents/${cfg.path}?ref=${cfg.branch}`,
      { headers: { Authorization: `Bearer ${cfg.token}`, Accept: "application/vnd.github+json" } }
    );
    if (!res.ok) throw new Error(`GitHub load failed: ${res.status} ${await res.text()}`);
    const json = await res.json() as any;
    const decoded = JSON.parse(atob(json.content.replace(/\n/g, ""))) as T;
    return { data: decoded, sha: json.sha };
  }
  
  export async function saveJson<T>(
    cfg: GitHubStoreConfig,
    content: T,
    prevSha: string,
    message = "Update data.json"
  ) {
    const body = {
      message,
      content: btoa(unescape(encodeURIComponent(JSON.stringify(content, null, 2)))),
      branch: cfg.branch,
      sha: prevSha
    };
    const res = await fetch(
      `https://api.github.com/repos/${cfg.owner}/${cfg.repo}/contents/${cfg.path}`,
      {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${cfg.token}`,
          Accept: "application/vnd.github+json",
          "Content-Type": "application/json"
        },
        body: JSON.stringify(body)
      }
    );
    if (!res.ok) throw new Error(`GitHub save failed: ${res.status} ${await res.text()}`);
    return (await res.json()) as any; // returns new content with new sha
  }
  