---
description: Search Indeed for jobs matching targets in targets.md
allowed-tools: Read, Write, mcp__claude_ai_Indeed__search_jobs, mcp__claude_ai_Indeed__get_job_details
---

Search Indeed for jobs matching targets defined in `targets.md`.

## Arguments

<arguments>
$ARGUMENTS
</arguments>

Flags:
- `--save` → write results to `job-results/YYYY-MM-DD.md`
- `--details` → fetch full job descriptions (slower)
- `--location <loc>` → override locations
- `--role <role>` → override roles

## Steps

1. **Read targets**: Read `targets.md`, parse: target roles, target locations, MIN compensation (treat `inf` as no upper bound, `_` as thousand separators).

2. **Apply overrides**: `--location` or `--role` → replace parsed list with that value.

3. **Search Indeed**: For every (role, location) pair, call `mcp__claude_ai_Indeed__search_jobs`:
   - `search` = role, `location` = location ("remote" if "Remote"), `country_code` = "US", `job_type` = "fulltime"
   - Deduplicate by job ID across searches.

4. **Filter by compensation**: Exclude jobs with listed maximum below MIN. Unlisted salary → keep with note "Salary not listed".

5. **If `--details`**: Call `mcp__claude_ai_Indeed__get_job_details` for each job. Summarize key requirements in 1-2 lines.

6. **Display results**: Group by location. Per job: clickable title (embed apply URL, no stripped params), company, salary or "Not listed", 1-line summary if `--details`. Header: total unique jobs found, total after compensation filter.

7. **If `--save`**: Write full results to `job-results/YYYY-MM-DD.md` (create dir if needed). Tell user path.

## Rules

- Always embed apply links on job titles — never strip URL parameters
- Never fabricate salary — mark missing as "Not listed"
- No results for a search → note it and continue
- Keep all job IDs intact for deduplication
