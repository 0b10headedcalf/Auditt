---
description: Auto-fill a job application on Greenhouse/Lever/Ashby and pause for human submit
allowed-tools: Read, Write, Edit, Bash(ls:*), Bash(find:*), Bash(date:*), Bash(grep:*), Bash(realpath:*), Bash(mkdir:*), mcp__playwright__browser_navigate, mcp__playwright__browser_snapshot, mcp__playwright__browser_click, mcp__playwright__browser_type, mcp__playwright__browser_select_option, mcp__playwright__browser_file_upload, mcp__playwright__browser_take_screenshot, mcp__playwright__browser_wait_for, mcp__playwright__browser_evaluate, mcp__playwright__browser_press_key
---

## Usage

```
/auditt:apply <company-or-jd-file>
/auditt:apply --jd <path> [--resume <path>] [--url <url>]
```

- No flags → fuzzy-match `$ARGUMENTS` against `JD/` filenames
- `--jd <path>` — explicit JD log file
- `--resume <path>` — override resume (default: most recent matching `Resumes/*.pdf`)
- `--url <url>` — override application URL (default: parsed from JD log)

## Input

<arguments>
$ARGUMENTS
</arguments>

## Steps

1. **Resolve JD file**: Parse args. Fuzzy match against `JD/*.md` if no `--jd`.
   - No match → list candidates and stop.

2. **Extract URL**:
   - `--url` arg wins
   - Else grep JD log for first URL matching `greenhouse.io|lever.co|ashbyhq.com`
   - None found → print: "No supported ATS URL in JD log. Add one with `--url` or paste it into the JD file." and stop.

3. **Detect ATS** from URL:
   - `boards.greenhouse.io` or `*.greenhouse.io` → `greenhouse`
   - `jobs.lever.co` → `lever`
   - `jobs.ashbyhq.com` or `ashbyhq.com` → `ashby`
   - Else → stop: "Unsupported ATS. Supported: Greenhouse, Lever, Ashby."

4. **Resolve resume**:
   - `--resume` arg wins
   - Else parse `Resume:` field in JD log. Prefer `.pdf` sibling of the `.odt`.
   - No file → stop and list `Resumes/`.

5. **Load answer data**:
   - Read `data/profile.md` (name, email, phone, address, links)
   - Read `data/application-answers.md` (work auth, logistics, EEO, etc.)
   - Build flat lookup dict in memory.

6. **Open application**:
   - `browser_navigate` to URL.
   - `browser_snapshot` — get accessibility tree.
   - On Lever, click "Apply for this job" if present (`browser_click` on matching ref).

7. **Fill form** (ATS-specific selectors below). Strategy:
   - Always work from `browser_snapshot` refs, not raw CSS.
   - Map each visible field label → answer key (see mapping table).
   - Use `browser_file_upload` for resume.
   - For dropdowns: `browser_select_option`.
   - For radios/checkboxes: `browser_click` on the matching label ref.
   - For "decline" EEO answers, click the "Decline to self-identify" option.
   - Unknown / unmappable field → leave blank, log to gaps list.

8. **Screenshot pre-submit**: `browser_take_screenshot` to `output/applications/<slug>_pre_submit.png`.

9. **Stop before submit**. Print to user:
   - Company, role, URL
   - Resume used
   - Filled field count
   - Unfilled / gaps list (with field labels)
   - Screenshot path
   - "Review the browser window, then submit yourself. Run `/auditt:apply --log <jd-file>` after submitting to append to applications.jsonl."

10. **If `--log` flag present** (post-submit): append one line to `output/applications.jsonl`:
    ```json
    {"date":"<YYYY-MM-DD>","company":"<co>","role":"<title>","url":"<url>","resume":"<path>","jd":"<path>","status":"submitted"}
    ```
    Create file if missing. No browser action.

## Field mapping (label keyword → answer key)

Match case-insensitive, substring. First match wins.

| Label contains | Source key |
|---|---|
| "first name" | profile.first_name (split from full name) |
| "last name" | profile.last_name |
| "full name", "name" | profile.name |
| "email" | profile.email |
| "phone" | profile.phone |
| "linkedin" | answers.linkedin |
| "github" | answers.github |
| "portfolio", "website" | answers.portfolio |
| "resume", "cv" | upload resume file |
| "cover letter" | skip (separate skill handles) |
| "current company" | most recent employer from profile work history |
| "current title" | most recent title from profile |
| "location", "city" | answers.current_location |
| "authorized to work", "work authorization" | answers.work_auth_us (yes/no) |
| "sponsorship", "visa", "h1b", "h-1b" | answers.sponsorship_required (yes/no) |
| "salary", "compensation expectation" | answers.salary_expectation |
| "start date", "available" | answers.earliest_start_date |
| "notice period" | answers.notice_period |
| "relocate" | answers.willing_to_relocate |
| "remote", "hybrid", "onsite" | answers.remote_preference |
| "how did you hear" | answers.referral_source |
| "why" + ("interested" / "want" / "company") | answers.why_company |
| "why" + ("role" / "position") | answers.why_role |
| "gender" | answers.gender (decline → "Decline to self-identify") |
| "race", "ethnicity" | answers.ethnicity |
| "veteran" | answers.veteran_status |
| "disability" | answers.disability_status |
| "over 18", "18 years" | answers.over_18 |
| "felony", "convicted" | answers.felony_conviction |
| "non-compete", "non compete" | answers.non_compete |

## ATS-specific notes

### Greenhouse
- Resume field: input `#resume` or label "Attach Resume/CV"
- Name fields split: `#first_name`, `#last_name`
- Custom questions: `.field[data-qa]` blocks with dynamic IDs — match by visible label
- EEO section at bottom under "U.S. Equal Opportunity Employment Information"

### Lever
- Single name field: input[name="name"]
- Resume: input[name="resume"]
- Custom questions: cards under "Additional information"
- "Apply for this job" button must be clicked first to reveal form

### Ashby
- React app — wait for form to mount before snapshot
- Fields use generated IDs — must match by accessibility label
- File upload via dropzone; use `browser_file_upload` against the input ref under the dropzone

## Rules

- Never click final submit button. Stop at the step before. Acceptable button labels to AVOID clicking: "Submit application", "Submit", "Send application", "Apply".
- If a required field has no match in answers, leave blank and add to gaps list — do not fabricate.
- If captcha or "verify you are human" appears, stop and tell user to solve it manually.
- If login/SSO redirect happens (rare on these ATS), stop.
- All actions visible — never run browser headless for this skill; user should be watching.

## Output

Single report at end:

```
Applied to: <Company> — <Role>
URL: <url>
ATS: <greenhouse|lever|ashby>
Resume: <path>
Filled: <N> fields
Gaps (review manually):
  - <field label>
  - <field label>
Screenshot: output/applications/<slug>_pre_submit.png

Next: review browser, submit, then run:
  /auditt:apply --log JD/<file>.md
```
