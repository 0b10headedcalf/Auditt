Search Gmail for newsletter-style emails containing grouped job postings and extract listings into a dated file.

Despite the legacy name, this command is **generic** — it works with any sender (SWEList, Hiring Cafe, Levels.fyi jobs, recruiter digests, Substack job boards, etc.). Default behavior biases toward aggregator emails that bundle multiple roles in one message.

## Arguments

`$ARGUMENTS` — optional Gmail search query (passed verbatim to `gmail.ts search`).

- No args → default query targeting job-aggregator newsletters from last 2 days (see step 1).
- Sender shortcut → if `$ARGUMENTS` is a bare email or domain (no `:` operators), wrap it as `from:<value> newer_than:2d`.
- Full query → if it already contains Gmail operators (`from:`, `subject:`, `newer_than:`, etc.), use as-is.

## Steps

1. **Build query**:
   - No args → `(from:swelist OR from:hiring.cafe OR from:jobs OR subject:"jobs" OR subject:"hiring" OR subject:"opportunities" OR subject:"roles") newer_than:2d`
   - Bare sender → `from:$ARGUMENTS newer_than:2d`
   - Has operators → `$ARGUMENTS` as-is
   - Run: `bun run scripts/gmail.ts search "<query>" --max 10`
   - Empty `[]` → widen to `newer_than:7d` once; if still empty, stop and report.
   - If `token.json` missing → tell user to run `bun run scripts/gmail-auth.ts` (see GMAIL_SETUP.md).

2. **Fetch bodies**: for each thread → `bun run scripts/gmail.ts body <threadId>`
   - Prefer `bodyText`; fall back to `bodyHtml` (strip tags) if empty.

3. **Filter to job-aggregator emails**. Keep a thread only if its body shows grouped postings. Heuristics — needs ≥2 of:
   - 3+ distinct application links (greenhouse.io, lever.co, ashbyhq.com, workday, jobs.<co>, linkedin.com/jobs, indeed.com, wellfound, smartrecruiters)
   - Repeated structural pattern: `Company - Role`, `Role @ Company`, or bulleted list of `<title> at <company>`
   - 3+ occurrences of "Apply", "Apply Now", or "View Job"
   - Section headings like "This week's jobs", "New roles", "Featured", "Hiring", followed by a list
   - Skip single-job emails, recruiter 1:1 outreach, newsletters w/ no listings.

4. **Extract per listing** (best-effort, omit fields not present):
   - Company name
   - Role / title
   - Location (Remote / Onsite / Hybrid + city)
   - Application link or job ID
   - Extras (salary, level, visa, YOE)

5. **Format**, one block per job separated by `---`:

```
Company: <name>
Role: <title>
Location: <location>
Apply: <url or job ID>
Details: <extras, or omit if none>
```

6. **Dedupe**: drop blocks where (company + role) match an earlier block. Prefer the entry with more fields filled.

7. **Date + filename**: `date +%Y-%m-%d`. Derive a source slug:
   - Single sender domain across kept threads → use that domain (e.g. `swelist`, `hiring-cafe`).
   - Multiple senders → `mixed`.
   - Output path: `./output/jobs-<slug>-YYYY-MM-DD.md` (overwrite if exists).

8. **Report**: jobs found, threads kept vs skipped (with skip reason counts), file path, date range of emails processed, senders included.

## Notes

- `gmail.ts` lives at `scripts/gmail.ts` and needs `credentials.json` + `token.json` in repo root.
- If a thread looks borderline (1 heuristic hit), include it but flag in the report so the user can prune.
- Never invent fields. Missing location → omit the line, don't write "Unknown".
