// /api/github/read.mts

// Minimal shape of the GitHub "contents" file response
type GitHubContentFile = {
  type: "file";
  sha: string;
  size: number;
  encoding?: string; // only present in "contents" response with content included
  content?: string;  // base64
};

// Runtime type guard
function isGitHubContentFile(x: unknown): x is GitHubContentFile {
  if (typeof x !== "object" || x === null) return false;
  const o = x as Record<string, unknown>;
  return (
    o["type"] === "file" &&
    typeof o["sha"] === "string" &&
    typeof o["size"] === "number"
  );
}

export default async function handler(req: any, res: any) {
  try {
    const owner = (req.query?.owner as string) || process.env.GH_OWNER;
    const repo  = (req.query?.repo  as string) || process.env.GH_REPO;
    const path  = (req.query?.path  as string) || process.env.GH_PATH || "data.json";
    const ref   = (req.query?.ref   as string) || process.env.GH_BRANCH || "main";

    if (!owner || !repo) {
      res.status(400).json({ ok: false, error: "Missing owner/repo" });
      return;
    }

    const token =
      process.env.GITHUB_TOKEN ||
      process.env.GH_TOKEN ||
      process.env.VERCEL_GITHUB_TOKEN ||
      "";

    const url = `https://api.github.com/repos/${owner}/${repo}/contents/${encodeURIComponent(
      path
    )}?ref=${encodeURIComponent(ref)}`;

    const ghRes = await fetch(url, {
      headers: {
        Authorization: token ? `Bearer ${token}` : "",
        Accept: "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28",
      },
    });

    // If GitHub returned an error, forward it
    if (!ghRes.ok) {
      const bodyText = await ghRes.text();
      let body: unknown;
      try { body = JSON.parse(bodyText); } catch { body = bodyText; }
      res.status(ghRes.status).json({
        ok: false,
        provider: "github",
        status: ghRes.status,
        statusText: ghRes.statusText,
        body,
      });
      return;
    }

    // json is unknown under strict mode; keep it as unknown and narrow
    const json: unknown = await ghRes.json();

    if (!isGitHubContentFile(json)) {
      res.status(500).json({
        ok: false,
        error: "Unexpected GitHub response shape",
        sample: json,
      });
      return;
    }

    // Decode if present
    let decoded: string | null = null;
    if (json.encoding === "base64" && typeof json.content === "string") {
      decoded = Buffer.from(json.content, "base64").toString("utf8");
    }

    // Try to parse JSON; ignore if it's not valid JSON
    let parsed: unknown = null;
    if (decoded) {
      try { parsed = JSON.parse(decoded); } catch { /* leave parsed null */ }
    }

    res.setHeader("Cache-Control", "no-store");
    res.status(200).json({
      ok: true,
      meta: { owner, repo, path, ref, sha: json.sha, size: json.size },
      raw: decoded,
      json: parsed,
    });
  } catch (e: any) {
    res.status(500).json({ ok: false, error: String(e) });
  }
}
