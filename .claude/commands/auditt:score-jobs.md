---
description: Score and rank job listings from job-results/ against your targets
allowed-tools: Read, Write, Bash(ls:*), Bash(find:*), Bash(date:*)
---

## Usage

```
/score-jobs
/score-jobs <filename-or-date>
/score-jobs --source <path>
```

- No args → most recent file in `job-results/`
- Partial date or name → fuzzy-match against `job-results/` filenames
- `--source <path>` → explicit file (also accepts `swelist-jobs-*.txt`)

## Arguments

<arguments>
$ARGUMENTS
</arguments>

## Steps

1. **Resolve source**: Parse `--source` flag or fuzzy-match `$ARGUMENTS` against `job-results/` and `swelist-jobs-*.txt`. No args → most recent `job-results/` file by date; if none, check `swelist-jobs-*.txt`. Empty/not found → stop and tell user.

2. **Read targets**: Read `targets.md`, extract: target roles, target locations, min/max compensation, recency window.

3. **Parse listings**: Extract per job: company, title, location, salary (if present), posting date (if present), apply URL.

4. **Score each job** (1-10, weighted, round to 1 decimal):

   | Factor | Weight | Scoring |
   |--------|--------|---------|
   | Role title match | 25% | Exact = 10, close variant = 7, tangential = 4, unrelated = 1 |
   | Location match | 20% | Target/Remote = 10, adjacent metro = 6, wrong region = 2 |
   | Compensation | 25% | At/above MIN = 10, within 15% below = 6, >15% below or unlisted = 4 |
   | Company signal | 15% | Tier-1 = 10, mid-market = 7, unknown = 5, red-flag (C2H hidden, MLM) = 1 |
   | Recency | 15% | <24h = 10, 1-3d = 7, 4-7d = 4, older = 1 |

5. **Rank and format**:

   Tiers:
   - **Tier 1 — Apply Now** (≥ 7.5)
   - **Tier 2 — Worth Considering** (5.5–7.4)
   - **Tier 3 — Low Priority** (< 5.5)

   Per job:
   ```
   ## [Score/10] Company — Role Title
   Location: [location] | Salary: [salary or "Not listed"] | Posted: [date or "Unknown"]
   Apply: [URL]
   Score breakdown: Role [x/10] · Location [x/10] · Comp [x/10] · Company [x/10] · Recency [x/10]
   Note: [1-line reason for any factor < 5 or ⚠️ red flags]
   ```

6. **Summary header**:
   ```
   Scored: [N] jobs | Tier 1: [N] | Tier 2: [N] | Tier 3: [N]
   Source: [filename] | Targets: [roles] in [locations]
   ```

7. **Save**: Write to `job-results/scored-<YYYY-MM-DD>.md`. Tell user path.

8. **Top 3 to act on today**: After ranked list, pick 3 highest Tier 1 jobs, suggest immediate next action for each (e.g. "run `/tailor-resume` with this JD", "check for referral", "apply directly").

## Rules

- Never fabricate salary — score compensation as 4 (unlisted) if missing
- Flag contract/C2H roles explicitly — company factor ≤ 3 by default
- If all Tier 3, say so clearly and suggest broadening targets
- Preserve apply URLs exactly — never truncate or reformat
