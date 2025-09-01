export default async function handler(req: any, res: any) {
  try {
    const token = process.env.GITHUB_TOKEN;
    if (!token) return res.status(500).json({ error: "Server misconfig: GITHUB_TOKEN missing" });

    const { owner, repo, path, ref = "main" } = req.query as any;
    if (!owner || !repo || !path) return res.status(400).json({ error: "Missing owner/repo/path" });

    const url = `https://api.github.com/repos/${owner}/${repo}/contents/${encodeURIComponent(path)}?ref=${encodeURIComponent(ref)}`;

    const gh = await fetch(url, {
      headers: {
        Authorization: `token ${token}`,
        "User-Agent": "rollercoaster-app",
        Accept: "application/vnd.github+json",
      },
    });

    const text = await gh.text();
    let body: any;
    try { body = JSON.parse(text); } catch { body = { raw: text }; }

    if (!gh.ok) return res.status(gh.status).json({ error: "GitHub READ failed", details: body });
    return res.status(200).json(body);
  } catch (e: any) {
    console.error("READ error", e);
    return res.status(500).json({ error: "Server error in READ", message: String(e) });
  }
}
