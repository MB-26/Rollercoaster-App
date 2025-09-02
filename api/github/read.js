// /api/github/read.js
export default async function handler(req, res) {
  try {
    // Accept query params, fall back to envs
    const owner = req.query.owner || process.env.GH_OWNER;
    const repo  = req.query.repo  || process.env.GH_REPO;
    const path  = req.query.path  || process.env.GH_PATH || "data.json";
    const ref   = req.query.ref   || process.env.GH_BRANCH || "main";

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

    if (!ghRes.ok) {
      const body = await ghRes.text();
      res.status(ghRes.status).json({
        ok: false,
        provider: "github",
        status: ghRes.status,
        statusText: ghRes.statusText,
        body: safeJson(body),
      });
      return;
    }

    const json = await ghRes.json(); // { content, encoding, ... }
    let decoded = null;
    if (json?.encoding === "base64" && typeof json?.content === "string") {
      decoded = Buffer.from(json.content, "base64").toString("utf8");
    }

    // If it's JSON, parse it for convenience
    let parsed = null;
    try {
      parsed = decoded ? JSON.parse(decoded) : null;
    } catch {
      /* leave parsed null if not valid JSON */
    }

    res.setHeader("Cache-Control", "no-store");
    res.status(200).json({
      ok: true,
      meta: {
        owner,
        repo,
        path,
        ref,
        sha: json.sha,
        size: json.size,
      },
      raw: decoded,
      json: parsed,
    });
  } catch (e) {
    res.status(500).json({ ok: false, error: String(e) });
  }
}

function safeJson(str) {
  try { return JSON.parse(str); } catch { return str; }
}
