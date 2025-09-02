// /api/debug/github-check.js (ESM)
export default async function handler(req, res) {
  const allow =
    process.env.ALLOW_DEBUG === "1" || process.env.NODE_ENV !== "production";
  if (!allow) {
    res.status(403).json({ ok: false, error: "Debug disabled in production." });
    return;
  }

  const token =
    process.env.GITHUB_TOKEN ||
    process.env.GH_TOKEN ||
    process.env.VERCEL_GITHUB_TOKEN ||
    "";

  const owner = process.env.GH_OWNER || "";
  const repo = process.env.GH_REPO || "";
  const path = process.env.GH_PATH || "data.json";
  const branch = process.env.GH_BRANCH || "main";

  if (!owner || !repo) {
    res
      .status(400)
      .json({ ok: false, error: "Missing GH_OWNER or GH_REPO envs." });
    return;
  }

  try {
    const url = `https://api.github.com/repos/${owner}/${repo}/contents/${encodeURIComponent(
      path
    )}?ref=${encodeURIComponent(branch)}`;

    const ghRes = await fetch(url, {
      headers: {
        Authorization: token ? `Bearer ${token}` : "",
        Accept: "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28",
      },
    });

    const text = await ghRes.text();
    let json;
    try {
      json = JSON.parse(text);
    } catch {
      json = { raw: text };
    }

    res.status(200).json({
      ok: ghRes.ok,
      status: ghRes.status,
      statusText: ghRes.statusText,
      hint:
        ghRes.status === 404
          ? "404 suggests wrong owner/repo/path/branch OR missing permissions."
          : ghRes.status === 401 || ghRes.status === 403
          ? "Auth/permissions problem—check token & repo access."
          : undefined,
      sample: json,
    });
  } catch (e) {
    res.status(500).json({ ok: false, error: String(e) });
  }
}
