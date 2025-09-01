// /api/github/save.ts
export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();

  const { owner, repo, path, message = "Update data", content, sha, branch = "main" } = req.body;

  const payload = {
    message,
    content: Buffer.from(typeof content === "string" ? content : JSON.stringify(content)).toString("base64"),
    sha: sha ?? undefined,
    branch,
  };

  const r = await fetch(
    `https://api.github.com/repos/${owner}/${repo}/contents/${encodeURIComponent(path)}`,
    {
      method: "PUT",
      headers: {
        Authorization: `token ${process.env.GITHUB_TOKEN}`,
        "User-Agent": "rollercoaster-app",
        Accept: "application/vnd.github+json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    }
  );

  const j = await r.json();
  res.status(r.status).json(j);
}
