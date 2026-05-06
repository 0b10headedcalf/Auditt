---
description: Tailor a resume from a template to match a job description
allowed-tools: Read, Write, Bash(ls:*), Bash(find:*), Bash(date:*), Bash(python3:*), Bash(libreoffice:*)
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

6. **Build ODT resume**: Use the template's ODT file (prefer `.odt` over `.md`). Inject tailored content via Python by splicing a new `<office:text>` body into the template's `content.xml`, preserving all original paragraph styles (P1–P9) and character styles (T19–T30) exactly. Write to `Resumes/<YYYY-MM-DD>_<Company>_<JobTitle>_resume.odt`.

   Style mapping reference (from SWEBASE.odt):
   - `P1` / `T19` — name (centered, Arial 16pt)
   - `P2` / `T20` — contact line (centered, Arial 8.5pt #333333)
   - `P3` / `T21` — section header with bottom border (EDUCATION / EXPERIENCE / PROJECTS / SKILLS)
   - `P4` / `T26` + `T29` — project/role header (bold name + light context, right-tab for date)
   - `P4` / `T23` + `T24` — education institution (bold #444444 + date 9pt #444444)
   - `P5` / `T24` — education sub-lines
   - `P6` / `T27` — bullet list items (WWNum1 list style, margin-left 0.25in)
   - `P7` / `T30` + `T27` — alternate project header (Daileet-style: bold name + plain subtitle)
   - `P8` / `T27` — bullet items under P7-style headers
   - `P9` / `T30` + `T27` — skills lines (bold label + plain values)

   Python snippet structure:
   ```python
   import zipfile, re, io, shutil
   # Read template, build new_body XML string using exact style names above,
   # replace <office:body>...</office:body> via regex, write clean zip.
   ```

7. **Convert to PDF**: Run:
   ```bash
   libreoffice --headless --convert-to pdf --outdir Resumes Resumes/<slug>_resume.odt
   ```
   Confirm `Resumes/<slug>_resume.pdf` exists.

8. **Build JD log**:
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

9. **Save JD log**: Write to `JD/<YYYY-MM-DD>_<Company>_<JobTitle>.md`. Update `Resume:` field to reference the `.odt` path.

10. **Report**: Template used, ODT path, PDF path, JD log path, 3-5 bullet summary of key changes, gaps needing manual edits.

## Rules

- Never fabricate experience, companies, dates, or credentials
- Use `[PLACEHOLDER]` for values needing real data
- Preserve all factual template content — only reorder, reframe, emphasize
- Template structure is sacred: same sections, heading levels, order
- If JD is empty, ask user to paste one
