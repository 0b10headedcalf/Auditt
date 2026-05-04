---
description: Generate a tailored cover letter from a JD log and resume
allowed-tools: Read, Write, Bash(ls:*), Bash(find:*), Bash(date:*), mcp__claude_ai_Gmail__create_draft
---

Write a targeted cover letter for a specific job. Pairs with `/tailor-resume`.

## Usage

```
/cover-letter <company-or-jd-file>
/cover-letter --jd <path> --resume <path> [--draft]
```

- No flags → fuzzy-match `$ARGUMENTS` against `JD/`
- `--jd <path>` — explicit JD file or raw JD text
- `--resume <path>` — explicit resume; if omitted, find most recent `Resumes/` match for same company/role
- `--draft` → also save as Gmail draft (to dc2000a@gmail.com)

## Arguments

<arguments>
$ARGUMENTS
</arguments>

## Steps

1. **Resolve JD**: `--jd` given → read it. Otherwise `ls JD/`, fuzzy-match `$ARGUMENTS`, pick best match; if ambiguous, list and stop. Extract: company, role, mission/product focus, key requirements, cultural signals.

2. **Resolve resume**: `--resume` given → read it. Otherwise find most recent matching file in `Resumes/`; fall back to `base-resume-template.md`. Extract: strongest relevant experiences, skills, 1-2 standout achievements.

3. **Write cover letter** — exactly 3 paragraphs:

   **P1 — Hook + fit signal** (3-4 sentences): Open with specific genuine reason this company/role is interesting — reference something real from JD (product, tech, mission, problem space). NOT "I am excited to apply." State role. One-line thesis: why this candidate fits.

   **P2 — Evidence** (4-5 sentences): 2 concrete resume examples mapping to JD's top requirements. Use specific numbers/outcomes; `[PLACEHOLDER]` where missing. Connect explicitly: "when I did X, I developed Y which is relevant to Z in this role."

   **P3 — Close** (2-3 sentences): Genuine interest in problem space. Clear call to action. No "thank you for your consideration."

   **Tone**: Direct, confident, specific. No adjective inflation ("passionate", "dynamic", "innovative"). Sound like a person, not a template.

4. **Format output**:
   ```
   [Your Name]
   [Date]

   Hiring Team / [Hiring Manager if named in JD]
   [Company Name]

   Re: [Role Title]

   [paragraph 1]

   [paragraph 2]

   [paragraph 3]

   [Your Name]
   ```

5. **Save**: `Resumes/<YYYY-MM-DD>_<Company>_<Role>_cover.md`

6. **If `--draft`**: Create Gmail draft via `mcp__claude_ai_Gmail__create_draft` — to: dc2000a@gmail.com, subject: `Application: [Role] at [Company]`, body: cover letter text. Tell user to update To field before sending.

7. **Report**: File path. Flag any `[PLACEHOLDER]` values. Note if letter references anything unsupported by resume.

## Rules

- Never open with "I am writing to express my interest" or "I am excited to apply"
- Never use: passionate, dynamic, innovative, synergy, leverage (as verb), utilize
- Never fabricate experience — `[PLACEHOLDER]` for missing specifics
- 3 paragraphs max — no exceptions
- If JD has no cultural/product signals, ask user for one genuine thing they find interesting before writing
