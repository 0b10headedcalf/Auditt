/**
 * Gmail API client — importable module and CLI.
 *
 * As module:
 *   import { searchThreads, getThread } from "./gmail.ts";
 *
 * As CLI (outputs JSON to stdout):
 *   bun run gmail.ts search "from:swelist newer_than:2d" [--max 10]
 *   bun run gmail.ts body <messageId>
 *
 * Web-friendly core; Bun file I/O only at the token-loading edge.
 * Swap readToken() for a fetch/localStorage equivalent to run in-browser.
 */

import { readFileSync, writeFileSync } from "node:fs";

// ── Types ─────────────────────────────────────────────────────────────────────

export interface ThreadSummary {
  id:       string;
  subject:  string;
  sender:   string;
  date:     string;
  snippet:  string;
}

export interface Message {
  id:       string;
  subject:  string;
  sender:   string;
  date:     string;
  bodyText: string;
  bodyHtml: string;
}

export interface Thread {
  id:       string;
  messages: Message[];
}

interface Token {
  access_token:  string;
  refresh_token: string;
  expiry_date:   number;
}

interface Credentials {
  installed: { client_id: string; client_secret: string };
}

// ── Token management ──────────────────────────────────────────────────────────

const TOKEN_PATH = "./token.json";
const CREDS_PATH = "./credentials.json";

function readToken(): Token {
  try {
    return JSON.parse(readFileSync(TOKEN_PATH, "utf-8")) as Token;
  } catch {
    console.error("token.json not found. Run: bun run gmail-auth.ts");
    process.exit(1);
  }
}

async function refreshToken(token: Token): Promise<Token> {
  let creds: Credentials;
  try {
    creds = JSON.parse(readFileSync(CREDS_PATH, "utf-8")) as Credentials;
  } catch {
    console.error("credentials.json not found. See GMAIL_SETUP.md.");
    process.exit(1);
  }

  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id:     creds.installed.client_id,
      client_secret: creds.installed.client_secret,
      refresh_token: token.refresh_token,
      grant_type:    "refresh_token",
    }),
  });

  if (!res.ok) throw new Error(`Token refresh failed: ${await res.text()}`);

  const refreshed = await res.json() as Record<string, unknown>;
  const updated: Token = {
    ...token,
    access_token: refreshed["access_token"] as string,
    expiry_date:  Date.now() + (refreshed["expires_in"] as number) * 1000,
  };

  writeFileSync(TOKEN_PATH, JSON.stringify(updated, null, 2));
  return updated;
}

async function getAccessToken(): Promise<string> {
  let token = readToken();
  if (Date.now() >= token.expiry_date - 60_000) {
    token = await refreshToken(token);
  }
  return token.access_token;
}

// ── Gmail API helpers ─────────────────────────────────────────────────────────

async function gmailGet(path: string, params?: Record<string, string>): Promise<unknown> {
  const accessToken = await getAccessToken();
  const url = new URL(`https://gmail.googleapis.com/gmail/v1/users/me${path}`);
  if (params) {
    for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
  }

  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!res.ok) throw new Error(`Gmail API error ${res.status}: ${await res.text()}`);
  return res.json();
}

// ── Body decoding ─────────────────────────────────────────────────────────────

function decodeBase64Url(data: string): string {
  const base64 = data.replace(/-/g, "+").replace(/_/g, "/");
  return Buffer.from(base64, "base64").toString("utf-8");
}

interface Payload {
  mimeType?: string;
  body?: { data?: string };
  parts?: Payload[];
  headers?: Array<{ name: string; value: string }>;
}

function extractBodyPart(payload: Payload, mimeType: string): string {
  if (payload.mimeType === mimeType && payload.body?.data) {
    return decodeBase64Url(payload.body.data);
  }
  if (payload.parts) {
    for (const part of payload.parts) {
      const found = extractBodyPart(part, mimeType);
      if (found) return found;
    }
  }
  return "";
}

function parseMessage(raw: Record<string, unknown>): Message {
  const payload  = (raw["payload"] ?? {}) as Payload;
  const headers  = payload.headers ?? [];
  const get      = (name: string) =>
    headers.find((h) => h.name.toLowerCase() === name.toLowerCase())?.value ?? "";

  const bodyText = extractBodyPart(payload, "text/plain");
  const bodyHtml = extractBodyPart(payload, "text/html");

  return {
    id:       raw["id"] as string,
    subject:  get("Subject"),
    sender:   get("From"),
    date:     get("Date"),
    bodyText,
    bodyHtml,
  };
}

// ── Public API ────────────────────────────────────────────────────────────────

export async function searchThreads(
  query: string,
  maxResults = 10
): Promise<ThreadSummary[]> {
  const data = await gmailGet("/threads", {
    q:          query,
    maxResults: String(maxResults),
  }) as { threads?: Array<{ id: string; snippet: string }> };

  if (!data.threads?.length) return [];

  const summaries: ThreadSummary[] = [];
  for (const t of data.threads) {
    const thread = await gmailGet(`/threads/${t.id}`, {
      format: "metadata",
      metadataHeaders: "Subject,From,Date",
    }) as { messages: Array<{ payload: Payload }> };

    const first   = thread.messages[0];
    const headers = first?.payload.headers ?? [];
    const get     = (name: string) =>
      headers.find((h) => h.name.toLowerCase() === name.toLowerCase())?.value ?? "";

    summaries.push({
      id:      t.id,
      subject: get("Subject"),
      sender:  get("From"),
      date:    get("Date"),
      snippet: t.snippet,
    });
  }

  return summaries;
}

export async function getThread(threadId: string): Promise<Thread> {
  const data = await gmailGet(`/threads/${threadId}`, {
    format: "full",
  }) as { id: string; messages: Array<Record<string, unknown>> };

  return {
    id:       data.id,
    messages: data.messages.map(parseMessage),
  };
}

// ── CLI ───────────────────────────────────────────────────────────────────────

if (import.meta.main) {
  const args   = process.argv.slice(2);
  const cmd    = args[0];
  const maxIdx = args.indexOf("--max");
  const max    = maxIdx !== -1 ? parseInt(args[maxIdx + 1] ?? "10") : 10;

  if (cmd === "search") {
    const query = args[1];
    if (!query) {
      console.error('Usage: bun run gmail.ts search "<query>" [--max <n>]');
      process.exit(1);
    }
    const threads = await searchThreads(query, max);
    console.log(JSON.stringify(threads, null, 2));

  } else if (cmd === "body") {
    const threadId = args[1];
    if (!threadId) {
      console.error("Usage: bun run gmail.ts body <threadId>");
      process.exit(1);
    }
    const thread = await getThread(threadId);
    console.log(JSON.stringify(thread, null, 2));

  } else {
    console.error("Commands: search <query> [--max <n>] | body <threadId>");
    process.exit(1);
  }
}
