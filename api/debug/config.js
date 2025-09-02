// /api/debug/config.js (ESM)
export default async function handler(req, res) {
  // Deny in prod unless explicitly allowed
  const allow =
    process.env.ALLOW_DEBUG === "1" || process.env.NODE_ENV !== "production";
  if (!allow) {
    res.status(403).json({ ok: false, error: "Debug disabled in production." });
    return;
  }

  // Read envs (rename these if your project uses different keys)
  const token =
    process.env.GITHUB_TOKEN ||
    process.env.GH_TOKEN ||
    process.env.VERCEL_GITHUB_TOKEN ||
    "";

  const owner = process.env.GH_OWNER || "";
  const repo = process.env.GH_REPO || "";
  const branch = process.env.GH_BRANCH || "main";
  const path = process.env.GH_PATH || "data.json";
  const apiBase = "https://api.github.com";

  const mask = (t) => {
    if (!t) return null;
    if (t.length <= 8) return `${t[0]}***${t[t.length - 1]}`;
    return `${t.slice(0, 4)}…${t.slice(-2)}`;
  };

  res.status(200).json({
    ok: true,
    env: {
      hasToken: Boolean(token),
      tokenMasked: mask(token),
      owner,
      repo,
      branch,
      path,
      apiBase,
      nodeEnv: process.env.NODE_ENV,
    },
  });
}
