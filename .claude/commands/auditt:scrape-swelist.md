Search Gmail for SWEList emails received in the last 2 days and extract job listings into a dated file.

## Steps

1. Use `mcp__claude_ai_Gmail__search_threads` to find SWEList emails:
   - query: `from:swelist newer_than:2d` (try also `from:SWEList` or subject containing "SWEList" if no results)
   - maxResults: 5

2. For each thread found, use `mcp__claude_ai_Gmail__get_thread` to get the full content.

3. Parse the email body to extract job listings. Each listing typically contains:
   - Company name
   - Role/title
   - Location (remote/onsite/hybrid)
   - Application link or job ID
   - Any other relevant details (salary, experience level, etc.)

4. Format extracted jobs as clean text entries, one job per block separated by `---`.

5. Save to `/home/dcheng/Documents/Auditt/swelist-jobs-YYYY-MM-DD.txt` where the date is today's date (2026-05-02 format). If the file already exists, overwrite it with fresh data.

6. Report how many jobs were found and saved.

If no SWEList emails found in last 2 days, try `newer_than:5d` and report the date of the most recent one found.
