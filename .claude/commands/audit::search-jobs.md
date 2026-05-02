---
description: Search Indeed for jobs matching targets in targets.md
allowed-tools: Read, Write, mcp__claude_ai_Indeed__search_jobs, mcp__claude_ai_Indeed__get_job_details
---

Search Indeed for jobs matching the targets defined in `targets.md`.

## Arguments

<arguments>
$ARGUMENTS
</arguments>

Supported flags:
- `--save` — write results to `job-results/YYYY-MM-DD.md` in addition to displaying
- `--details` — fetch full job descriptions for each result (slower)
- `--location <loc>` — override locations, search only this location
- `--role <role>` — override roles, search only this role

## Steps

1. **Read targets**: Read `targets.md` and parse:
   - Target roles (lines under `## Target Roles:`)
   - Target locations (lines under `## Target Locations:`)
   - Min compensation (the `MIN:` value under `## Target Compensation:`) — treat `inf` as no upper bound, treat `_` as thousand separators

2. **Apply argument overrides**: If `--location` or `--role` flags were given, replace the parsed list with just that value.

3. **Search Indeed**: For every (role, location) pair, call `mcp__claude_ai_Indeed__search_jobs` with:
   - `search` = the role
   - `location` = the location (use "remote" if location is "Remote")
   - `country_code` = "US"
   - `job_type` = "fulltime"

   Run all searches. Collect every unique job (deduplicate by job ID if the same listing appears across searches).

4. **Filter by compensation**: Where salary data is available, exclude jobs with a listed maximum below the MIN compensation. If salary is unlisted, keep the job (include it with a note: "Salary not listed").

5. **If `--details` flag**: For each job in the filtered list, call `mcp__claude_ai_Indeed__get_job_details` to fetch the full description. Summarize key requirements in 1–2 lines.

6. **Display results**: Group results by location. For each job show:
   - Clickable job title (embed apply URL — do not strip query params)
   - Company name
   - Salary (or "Not listed")
   - 1-line summary of role if `--details` was used
   
   Show a header summary: total unique jobs found, total after compensation filter.

7. **If `--save` flag**: Write the full results as markdown to `job-results/YYYY-MM-DD.md` (create `job-results/` if it doesn't exist). Tell the user where it was saved.

## Rules

- Always embed apply links directly on job titles — never strip URL parameters
- Do not fabricate salary data; mark missing salary as "Not listed"
- If a search returns no results, note it and continue — do not stop
- Keep all job IDs intact for deduplication
