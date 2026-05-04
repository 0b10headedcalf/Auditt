Search Gmail for SWEList emails from last 2 days and extract job listings into a dated file.

## Steps

1. `mcp__claude_ai_Gmail__search_threads`: query `from:swelist newer_than:2d` (also try `from:SWEList` or subject "SWEList" if no results), maxResults: 5.

2. For each thread: `mcp__claude_ai_Gmail__get_thread` to get full content.

3. Parse email body, extract per listing: company, role/title, location (remote/onsite/hybrid), application link or job ID, any other details (salary, experience level).

4. Format as clean text, one job per block separated by `---`.

5. Save to `/home/dcheng/Documents/Auditt/swelist-jobs-YYYY-MM-DD.txt` (today's date). Overwrite if exists.

6. Report count of jobs found and saved.

If no SWEList emails in last 2 days, try `newer_than:5d` and report date of most recent found.
