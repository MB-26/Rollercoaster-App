// api/github/save.js
export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.status(405).json({ error: "Method Not Allowed" });
    return;
  }

  try {
    const token = process.env.GITHUB_TOKEN;
    if (!token) {
      res.status(500).json({ error: "Missing GITHUB_TOKEN on server." });
      return;
    }

    // Accept both shapes: {data: ...}  or  {content: ...}
    const {
      owner,
      repo,
      branch = "main",
      path,
      message = "Update data.json",
      data,        // preferred: your DataFile object
      content,     // optional: raw string/object to write
      sha,         // optional: current file sha (for updates)
      prevSha,     // optional alias used by your client
    } = req.body || {};

    if (!owner || !repo || !path) {
      res.status(400).json({ error: "Missing owner/repo/path" });
      return;
    }

    // Choose payload source
    let payload = data;
    if (typeof payload === "undefined") payload = content;

    if (typeof payload === "undefined") {
      res.status(400).json({ error: "Missing 'data' (preferred) or 'content' in request body." });
      return;
    }

    // Stringify and base64-encode the file contents
    const asString =
      typeof payload === "string" ? payload : JSON.stringify(payload, null, 2);
    const base64 = Buffer.from(asString, "utf8").toString("base64");

    const url = `https://api.github.com/repos/${owner}/${repo}/contents/${encodeURIComponent(
      path
    )}`;

    const ghRes = await fetch(url, {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/vnd.github+json",
        "Content-Type": "application/json",
        "X-GitHub-Api-Version": "2022-11-28",
      },
      body: JSON.stringify({
        message,
        content: base64,
        branch,
        // Only include sha for updates; support both 'sha' and 'prevSha'
        sha: prevSha || sha || undefined,
      }),
    });

    const body = await ghRes.json().catch(() => ({}));

    if (!ghRes.ok) {
      // Surface GitHub’s error back to the client so you can see the real cause
      res.status(ghRes.status).json({
        error: "GitHub save failed",
        status: ghRes.status,
        gh: body,
      });
      return;
    }

    // Normalize the response so the client can read either .content.sha or .commit.sha
    res.status(200).json({
      content: body.content || null,
      commit: body.commit || null,
    });
  } catch (err) {
    res.status(500).json({
      error: "FUNCTION_INVOCATION_FAILED",
      message: String(err && err.message ? err.message : err),
    });
  }
}
