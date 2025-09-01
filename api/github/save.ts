export default async function handler(req: any, res: any) {
  try {
    if (req.method !== "POST") return res.status(405).end();

    const token = process.env.GITHUB_TOKEN;
    if (!token) return res.status(500).json({ error: "Server misconfig: GITHUB_TOKEN missing" });

    const { owner, repo, path, message = "Update data", content, sha, branch = "main" } = (req.body ?? {}) as any;
    if (!owner || !repo || !path) return res.status(400).json({ error: "Missing owner/repo/path" });
    if (typeof content === "undefined") return res.status(400).json({ error: "Missing content" });

    const base64 = Buffer.from(typeof content === "string" ? content : JSON.stringify(content)).toString("base64");

    const url = `https://api.github.com/repos/${owner}/${repo}/contents/${encodeURIComponent(path)}`;
    const gh = await fetch(url, {
      method: "PUT",
      headers: {
        Authorization: `token ${token}`,
        "User-Agent": "rollercoaster-app",
        Accept: "application/vnd.github+json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ message, content: base64, sha: sha ?? undefined, branch }),
    });

    const text = await gh.text();
    let body: any;
    try { body = JSON.parse(text); } catch { body = { raw: text }; }

    if (!gh.ok) return res.status(gh.status).json({ error: "GitHub SAVE failed", details: body });
    return res.status(200).json(body);
  } catch (e: any) {
    console.error("SAVE error", e);
    return res.status(500).json({ error: "Server error in SAVE", message: String(e) });
  }
}
