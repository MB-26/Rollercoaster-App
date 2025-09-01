// /api/github/read.ts  (Node runtime on Vercel)
export default async function handler(req, res) {
  const { owner, repo, path, ref = "main" } = req.query;

  const r = await fetch(
    `https://api.github.com/repos/${owner}/${repo}/contents/${encodeURIComponent(path)}?ref=${ref}`,
    {
      headers: {
        Authorization: `token ${process.env.GITHUB_TOKEN}`,
        "User-Agent": "rollercoaster-app",
        Accept: "application/vnd.github+json",
      },
    }
  );

  const j = await r.json();
  res.status(r.status).json(j);
}
