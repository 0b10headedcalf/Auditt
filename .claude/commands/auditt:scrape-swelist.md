Search Gmail for SWEList emails from last 2 days and extract job listings into a dated file.

## Steps

1. Run via Bash: `bun run gmail.ts search "from:swelist newer_than:2d" --max 5`
   - If output is `[]`, retry with `newer_than:5d` and note the date of the most recent result
   - If token.json missing: tell user to run `bun run gmail-auth.ts` (see GMAIL_SETUP.md)

2. For each thread in the JSON results, run: `bun run gmail.ts body <threadId>`
   - Returns full thread with decoded `bodyText` and `bodyHtml` per message
   - Prefer `bodyText`; fall back to `bodyHtml` if bodyText is empty

3. Parse the email body. Extract per listing:
   - Company name
   - Role / title
   - Location (Remote / Onsite / Hybrid + city if given)
   - Application link or job ID
   - Any extras (salary range, experience level, visa sponsorship)

4. Format as clean text, one job per block separated by `---`:

```
Company: <name>
Role: <title>
Location: <location>
Apply: <url or job ID>
Details: <extras, or omit if none>
```

5. Get today's date: `date +%Y-%m-%d`

6. Save to `./output/swelist-jobs-YYYY-MM-DD.md` (overwrite if exists).

7. Report: count of jobs found, file path, date range of emails processed.

## Notes

- gmail.ts requires `credentials.json` and `token.json` in the project root.
  If missing, direct user to GMAIL_SETUP.md.
- If no SWEList emails in last 2 days, try `newer_than:5d` and report the
  date of the most recent email found.
- Skip duplicates if multiple emails cover the same job.
