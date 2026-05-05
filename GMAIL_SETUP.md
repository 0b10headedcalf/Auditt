# Gmail API Setup

Gives Auditt direct read-only access to your Gmail so skills like
`/scrape-swelist` can fetch full email bodies. One-time setup, ~10 minutes.

---

## Prerequisites

- A Google account with the Gmail inbox you want to read
- [Bun](https://bun.sh) installed (`curl -fsSL https://bun.sh/install | bash`)
- This project cloned and dependencies installed (`bun install`)

---

## Steps

### 1. Create a Google Cloud project

1. Go to [console.cloud.google.com](https://console.cloud.google.com)
2. Click the project dropdown at the top → **New Project**
3. Name it anything (e.g. `auditt`) → **Create**
4. Make sure the new project is selected in the dropdown

### 2. Enable the Gmail API

1. In the left sidebar: **APIs & Services** → **Library**
2. Search for `Gmail API` → click it → **Enable**

### 3. Configure the OAuth consent screen

1. **APIs & Services** → **OAuth consent screen**
2. Choose **External** → **Create**
3. Fill in required fields:
   - App name: `Auditt` (or anything)
   - User support email: your email
   - Developer contact email: your email
4. Click **Save and Continue** through all steps (no scopes needed here)
5. On the **Test users** step, click **Add Users** and add your Gmail address
6. **Save and Continue** → **Back to Dashboard**

### 4. Create OAuth credentials

1. **APIs & Services** → **Credentials** → **Create Credentials** → **OAuth client ID**
2. Application type: **Desktop app**
3. Name: `Auditt CLI` (or anything)
4. **Create** → a dialog shows your client ID and secret
5. Click **Download JSON** → save the file as `credentials.json` in this project's root directory

### 5. Run the auth flow

```bash
bun run gmail-auth.ts
```

- A browser tab opens asking you to sign in and grant read-only Gmail access
- After approving, the tab shows "Authorization successful!"
- `token.json` is saved to the project root — **keep this secret**

### 6. Test it

```bash
bun run gmail.ts search "from:swelist newer_than:7d" --max 3
```

You should see JSON with thread metadata. If you get an error, re-check Step 3
(your Gmail address must be in the test users list while the app is in testing mode).

---

## File reference

| File | Purpose | Commit? |
|------|---------|---------|
| `credentials.json` | OAuth client ID + secret from Google Cloud | **No** — gitignored |
| `token.json` | Access + refresh tokens for your account | **No** — gitignored |
| `gmail-auth.ts` | One-time auth script | Yes |
| `gmail.ts` | Gmail API client (module + CLI) | Yes |

---

## Scopes requested

`https://www.googleapis.com/auth/gmail.readonly` — read-only. Auditt never
sends, deletes, or modifies any email.

---

## Revoking access

To revoke: [myaccount.google.com/permissions](https://myaccount.google.com/permissions)
→ find `Auditt` → **Remove Access**.

Locally, delete `token.json`. The refresh token becomes invalid immediately after revocation.

---

## Troubleshooting

**"This app isn't verified"** — click **Advanced** → **Go to Auditt (unsafe)**.
Safe to proceed since you created this app yourself.

**"Access blocked: Authorization Error"** — your Gmail isn't in the test users list.
Go back to Step 3 and add it.

**Token expired errors** — `gmail.ts` auto-refreshes tokens. If refresh fails,
re-run `bun run gmail-auth.ts`.

**Port 3000 in use** — kill whatever is using it (`lsof -i :3000`) and retry.
