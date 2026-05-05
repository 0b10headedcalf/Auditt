/**
 * One-time Gmail OAuth setup.
 * Run: bun run gmail-auth.ts
 *
 * Reads credentials.json, opens a browser for Google consent,
 * receives the callback on localhost:3000, and saves token.json.
 * See GMAIL_SETUP.md for full instructions.
 */

import { readFileSync, writeFileSync } from "node:fs";

interface Credentials {
  installed: {
    client_id: string;
    client_secret: string;
    redirect_uris: string[];
    auth_uri: string;
    token_uri: string;
  };
}

const SCOPES      = "https://www.googleapis.com/auth/gmail.readonly";
const REDIRECT    = "http://localhost:3000/callback";
const CREDS_PATH  = "./credentials.json";
const TOKEN_PATH  = "./token.json";

// ── Load credentials ──────────────────────────────────────────────────────────

let creds: Credentials;
try {
  creds = JSON.parse(readFileSync(CREDS_PATH, "utf-8")) as Credentials;
} catch {
  console.error("credentials.json not found. Follow GMAIL_SETUP.md first.");
  process.exit(1);
}

const { client_id, client_secret } = creds.installed;

// ── Build auth URL ────────────────────────────────────────────────────────────

const authUrl = new URL("https://accounts.google.com/o/oauth2/v2/auth");
authUrl.searchParams.set("client_id",     client_id);
authUrl.searchParams.set("redirect_uri",  REDIRECT);
authUrl.searchParams.set("response_type", "code");
authUrl.searchParams.set("scope",         SCOPES);
authUrl.searchParams.set("access_type",   "offline");
authUrl.searchParams.set("prompt",        "consent");

console.log("Opening browser for Google authorization...");
console.log("If it doesn't open, visit:\n" + authUrl.toString() + "\n");

Bun.spawn(["xdg-open", authUrl.toString()], { stdout: "ignore", stderr: "ignore" });

// ── Local callback server ─────────────────────────────────────────────────────

const code = await new Promise<string>((resolve, reject) => {
  const timeout = setTimeout(
    () => reject(new Error("Auth timed out after 2 minutes.")),
    120_000
  );

  const server = Bun.serve({
    port: 3000,
    fetch(req) {
      const url   = new URL(req.url);
      const code  = url.searchParams.get("code");
      const error = url.searchParams.get("error");

      if (error) {
        clearTimeout(timeout);
        server.stop();
        reject(new Error(`Authorization denied: ${error}`));
        return new Response("Authorization denied. You can close this tab.");
      }

      if (code) {
        clearTimeout(timeout);
        server.stop();
        resolve(code);
        return new Response(
          "Authorization successful! Token saved. You can close this tab."
        );
      }

      return new Response("Waiting for authorization...");
    },
  });
});

// ── Exchange code for tokens ──────────────────────────────────────────────────

const res = await fetch("https://oauth2.googleapis.com/token", {
  method: "POST",
  headers: { "Content-Type": "application/x-www-form-urlencoded" },
  body: new URLSearchParams({
    code,
    client_id,
    client_secret,
    redirect_uri:  REDIRECT,
    grant_type:    "authorization_code",
  }),
});

if (!res.ok) {
  console.error("Token exchange failed:", await res.text());
  process.exit(1);
}

const token = await res.json() as Record<string, unknown>;
token["expiry_date"] = Date.now() + (token["expires_in"] as number) * 1000;

writeFileSync(TOKEN_PATH, JSON.stringify(token, null, 2));
console.log("token.json saved. Gmail access is ready.");
