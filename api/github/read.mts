// /api/github/read.mts
export default async function handler(req: any, res: any) {
  try {
    const owner = (req.query?.owner as string) || process.env.GH_OWNER;
    const repo  = (req.query?.repo as string)  || process.env.GH_REPO;
    const path  = (req.query?.path as string)  || process.env.GH_PATH || "data.json";
    const ref   = (req.query?.ref as string)   || process.env.GH_BRANCH || "main";

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
      const bodyText = await ghRes.text();
      let body: any;
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

    const json = await ghRes.json(); // includes base64 "content"
    let decoded: string | null = null;
    if (json?.encoding === "base64" && typeof json?.content === "string") {
      decoded = Buffer.from(json.content, "base64").toString("utf8");
    }

    let parsed: any = null;
    if (decoded) {
      try { parsed = JSON.parse(decoded); } catch { /* not JSON, leave null */ }
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
