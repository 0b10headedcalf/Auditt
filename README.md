# Auditt

AI-powered job search automation. Scrapes listings, scores them against your targets, tailors resumes, writes cover letters, and preps you for interviews — all from the CLI via Claude Code skills.

---

## What it does

| Skill | What it runs |
|-------|-------------|
| `/scrape-swelist` | Reads SWEList digest emails from Gmail, extracts job listings |
| `/search-jobs` | Searches Indeed for roles matching `data/targets.md` |
| `/score-jobs` | Scores and ranks listings in `job-results/` against your profile |
| `/tailor-resume` | Generates a tailored `.odt` resume from a template + JD |
| `/cover-letter` | Writes a tailored cover letter from a JD log and resume |
| `/interview-prep` | Generates STAR-framework interview questions from a JD |

---

## Setup

### Prerequisites

- [Bun](https://bun.sh) — `curl -fsSL https://bun.sh/install | bash`
- [Claude Code](https://claude.ai/code) — skills run inside Claude Code
- An Anthropic API key

### Install

```bash
git clone <repo>
cd auditt
bun install
```

### Configure

```bash
cp .env.example .env
# Set ANTHROPIC_API_KEY in .env
```

Edit `data/targets.md` with your target roles, locations, and compensation. Edit `data/profile.md` with your background.

### Gmail integration (optional)

Required for `/scrape-swelist`. See [GMAIL_SETUP.md](GMAIL_SETUP.md) for the full OAuth flow (~10 minutes).

---

## Usage

Open Claude Code in this directory and run any skill:

```
/scrape-swelist          # pull SWEList emails from last 2 days
/search-jobs             # search Indeed → job-results/YYYY-MM-DD.md
/score-jobs              # rank results → job-results/scored-YYYY-MM-DD.md
/tailor-resume           # pick a JD, generate tailored resume
/cover-letter            # generate cover letter
/interview-prep          # generate prep questions
```

Skills are chained — typical flow: scrape/search → score → tailor resume → cover letter.

---

## Project structure

```
data/
  profile.md          # your background (used by scoring + tailoring)
  targets.md          # roles, locations, compensation floor
Templates/
  SWEBASE.odt         # base resume template
  SWEBASE.md          # markdown mirror of the template
job-results/
  YYYY-MM-DD.md       # raw listings from search/scrape
  scored-YYYY-MM-DD.md
Resumes/              # generated tailored resumes (gitignored)
scripts/
  gmail.ts            # Gmail API client (module + CLI)
  gmail-auth.ts       # one-time OAuth flow
  build_resume_odt.ts # ODT resume builder
```

---

## Resume builder

Directly builds ODT files by patching the template's `content.xml` — no LibreOffice dependency, no formatting drift.

```bash
bun run scripts/build_resume_odt.ts \
  --template SWEBASE \
  --slug 2026-05-04_company_role
# → Resumes/2026-05-04_company_role_resume.odt
```

---

## Gmail CLI

```bash
bun run scripts/gmail.ts search "from:swelist newer_than:2d" --max 10
bun run scripts/gmail.ts body <threadId>
```

---

## Secrets

| File | Purpose | Committed |
|------|---------|-----------|
| `.env` | `ANTHROPIC_API_KEY` | No |
| `credentials.json` | Google OAuth client | No |
| `token.json` | Gmail access/refresh tokens | No |
