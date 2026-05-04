---
description: Tailor a resume from a template to match a job description
allowed-tools: Read, Write, Bash(ls:*), Bash(find:*), Bash(date:*)
---

## Usage

```
/tailor-resume [job description]
/tailor-resume --template <name> [job description]
```

- `--template <name>` — optional. Case-insensitive partial match against `Templates/` filenames.
- Everything else is the job description.

## Input

<arguments>
$ARGUMENTS
</arguments>

Parse first: if starts with `--template`, extract template name (next token), remainder = JD. Otherwise entire input = JD.

## Steps

1. **Resolve template**: List `Templates/` (and `templates/` if exists).
   - `--template` given → find best case-insensitive partial match. No match → list options and stop.
   - No `--template` → if one file, use it; if multiple, auto-pick best for the role and tell user which and why.

2. **Read template**: Read full content of chosen template.

3. **Analyze JD**: Extract job title, company, required skills/tech, key responsibilities, preferred qualifications, ATS keywords.

4. **Tailor resume**:
   - Preserve exact template structure (same headings, order, markdown formatting)
   - Lead with most relevant experience for this role
   - Mirror JD language and keywords naturally
   - Quantify achievements; use `[X%]` placeholders where unknown
   - De-emphasize irrelevant experience; adjust summary to speak to this position
   - Ensure ATS-critical keywords appear
   - Do NOT add or remove sections

5. **Determine slug**: Derive `<Company>` and `<JobTitle>` from JD (lowercase, hyphens, no special chars). Run `date +%Y-%m-%d`.

6. **Save resume**: Write to `Resumes/<YYYY-MM-DD>_<Company>_<JobTitle>_resume.md`.

7. **Build JD log**:
   ```
   # <Company> — <JobTitle>
   Date: <YYYY-MM-DD>
   Template: <template filename>
   Resume: Resumes/<filename>

   ---

   ## Job Description

   <full job description text, verbatim>

   ---

   ## Tailoring Log

   ### What changed
   - <section → what changed and why>

   ### Keywords added
   - <keyword> — <where placed>

   ### Gaps / manual follow-up needed
   - <anything user needs to fill in or verify>
   ```

8. **Save JD log**: Write to `JD/<YYYY-MM-DD>_<Company>_<JobTitle>.md`.

9. **Report**: Template used, resume path, JD log path, 3-5 bullet summary of key changes, gaps needing manual edits.

## Rules

- Never fabricate experience, companies, dates, or credentials
- Use `[PLACEHOLDER]` for values needing real data
- Preserve all factual template content — only reorder, reframe, emphasize
- Template structure is sacred: same sections, heading levels, order
- If JD is empty, ask user to paste one
