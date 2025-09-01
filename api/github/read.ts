import type { VercelRequest, VercelResponse } from "@vercel/node";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const { owner, repo, path, ref = "main" } = req.query as {
    owner: string; repo: string; path: string; ref?: string;
  };

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
