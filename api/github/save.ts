import type { VercelRequest, VercelResponse } from "@vercel/node";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") return res.status(405).end();

  const { owner, repo, path, message = "Update data", content, sha, branch = "main" } =
    (req.body ?? {}) as {
      owner: string; repo: string; path: string;
      message?: string; content: unknown; sha?: string; branch?: string;
    };

  const base64 = Buffer.from(
    typeof content === "string" ? content : JSON.stringify(content)
  ).toString("base64");

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
      body: JSON.stringify({ message, content: base64, sha, branch }),
    }
  );

  const j = await r.json();
  res.status(r.status).json(j);
}
