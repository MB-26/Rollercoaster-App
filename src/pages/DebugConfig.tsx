// src/pages/DebugConfig.tsx
import { useEffect, useState } from "react";
import type { GitHubStoreConfig } from "../services/githubStore"; // adjust path if needed

// If you keep your client config somewhere else, import from there.
// Or pass it down as props if that’s easier for your setup.
const clientConfigExample: Partial<GitHubStoreConfig> = {
  owner: "MB-26",            // or wherever you source these from
  repo: "coasterbook-data",
  branch: "main",
  path: "data.json",
};

type ServerEnv = {
  ok: boolean;
  env?: {
    hasToken: boolean;
    tokenMasked: string | null;
    owner: string;
    repo: string;
    branch: string;
    path: string;
    apiBase: string;
    nodeEnv?: string;
  };
  error?: string;
};

type CheckResp = {
  ok: boolean;
  status: number;
  statusText: string;
  hint?: string;
  sample?: any;
  error?: string;
};

export default function DebugConfig() {
  const [serverEnv, setServerEnv] = useState<ServerEnv | null>(null);
  const [check, setCheck] = useState<CheckResp | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const r = await fetch("/api/debug/config");
        const j = (await r.json()) as ServerEnv;
        setServerEnv(j);
      } catch (e: any) {
        setServerEnv({ ok: false, error: String(e) });
      }
    })();

    (async () => {
      try {
        const r = await fetch("/api/debug/github-check");
        const j = (await r.json()) as CheckResp;
        setCheck(j);
      } catch (e: any) {
        setCheck({ ok: false, status: 0, statusText: "Fetch failed", error: String(e) } as any);
      }
    })();
  }, []);

  return (
    <div style={{ padding: 24, maxWidth: 900, margin: "0 auto", fontFamily: "system-ui, sans-serif" }}>
      <h1>Debug Config (Temporary)</h1>
      <p style={{ marginTop: 0, color: "#666" }}>
        Remove this page once you’ve verified your setup. It masks tokens and blocks in prod unless <code>ALLOW_DEBUG=1</code>.
      </p>

      <section>
        <h2>Client Config (what your app is using)</h2>
        <pre style={preStyle}>{JSON.stringify(clientConfigExample, null, 2)}</pre>
        <p style={{ color: "#666" }}>
          If these don’t match what you expect, check wherever you construct <code>GitHubStoreConfig</code>.
        </p>
      </section>

      <section>
        <h2>Server Env (from Vercel)</h2>
        {!serverEnv ? (
          <p>Loading…</p>
        ) : serverEnv.ok ? (
          <pre style={preStyle}>{JSON.stringify(serverEnv.env, null, 2)}</pre>
        ) : (
          <div style={errorBox}>Error: {serverEnv.error || "Unknown error"}</div>
        )}
        <ul>
          <li>
            <strong>hasToken:</strong>{" "}
            {serverEnv?.env?.hasToken ? "✅ yes" : "❌ no"}
          </li>
          <li>
            <strong>tokenMasked:</strong> {serverEnv?.env?.tokenMasked ?? "null"}
          </li>
          <li>
            <strong>owner/repo/branch/path:</strong>{" "}
            {serverEnv?.env
              ? `${serverEnv.env.owner}/${serverEnv.env.repo}@${serverEnv.env.branch} → ${serverEnv.env.path}`
              : "–"}
          </li>
          <li>
            <strong>NODE_ENV:</strong> {serverEnv?.env?.nodeEnv ?? "–"}
          </li>
        </ul>
      </section>

      <section>
        <h2>GitHub API Check (server-side)</h2>
        {!check ? (
          <p>Running check…</p>
        ) : check.ok ? (
          <>
            <div style={okBox}>
              ✅ Success — GitHub responded {check.status} {check.statusText}
            </div>
            <details>
              <summary>Response sample</summary>
              <pre style={preStyle}>{JSON.stringify(check.sample, null, 2)}</pre>
            </details>
          </>
        ) : (
          <>
            <div style={errorBox}>
              ❌ Failed — {check.status} {check.statusText} {check.error ? `(${check.error})` : ""}
            </div>
            {check.hint && <p style={{ color: "#666" }}>{check.hint}</p>}
            {check.sample && (
              <details>
                <summary>Response body</summary>
                <pre style={preStyle}>{JSON.stringify(check.sample, null, 2)}</pre>
              </details>
            )}
          </>
        )}
      </section>
    </div>
  );
}

const preStyle: React.CSSProperties = {
  background: "#f6f8fa",
  padding: 12,
  borderRadius: 8,
  overflowX: "auto",
  border: "1px solid #e5e7eb",
};

const errorBox: React.CSSProperties = {
  background: "#fff1f2",
  padding: 12,
  border: "1px solid #fecdd3",
  borderRadius: 8,
  color: "#9f1239",
};

const okBox: React.CSSProperties = {
  background: "#ecfdf5",
  padding: 12,
  border: "1px solid #a7f3d0",
  borderRadius: 8,
  color: "#065f46",
};
