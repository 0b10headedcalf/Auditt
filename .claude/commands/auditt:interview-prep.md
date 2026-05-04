---
description: Generate interview prep questions and STAR frameworks from a JD and resume
allowed-tools: Read, Write, Bash(ls:*), Bash(find:*), Bash(date:*)
---

## Usage

```
/interview-prep <company-or-jd-file>
/interview-prep --jd <path> --resume <path>
```

- No flags → fuzzy-match `$ARGUMENTS` against `JD/` filenames
- `--jd <path>` — explicit JD file or raw JD text
- `--resume <path>` — explicit resume; if omitted, find most recent `Resumes/` match for same company/role

## Arguments

<arguments>
$ARGUMENTS
</arguments>

## Steps

1. **Resolve JD**: `--jd` given → read it. Otherwise `ls JD/`, fuzzy-match `$ARGUMENTS`, pick best match; if ambiguous, list and stop. Extract: company, role, required skills, responsibilities, seniority signals.

2. **Resolve resume**: `--resume` given → read it. Otherwise find most recent matching file in `Resumes/`; fall back to `base-resume-template.md`. Extract: tech stack, experience highlights, projects, past roles.

3. **Generate behavioral questions** (8 questions): Draw from JD responsibilities and team/culture signals. Map each to a competency (ownership, collaboration, ambiguity, etc.). For each, write STAR framework using actual resume content:
   ```
   **Q: Tell me about a time you [...]**
   Competency: [ownership / collaboration / etc.]
   STAR framework:
   - Situation: [setup from resume experience]
   - Task: [what was needed]
   - Action: [specific things candidate did — from resume]
   - Result: [quantified outcome or lesson — use [X%] if unknown]
   ```

4. **Generate technical questions** (6 questions): Based on JD required skills cross-referenced with candidate's skills. Mix: 2 conceptual, 2 applied/system-design, 2 "how would you approach X". Include 2-3 line answer outline per question. Flag any JD skill not in resume with ⚠️.

5. **Generate questions to ask interviewer** (5 questions): Role-specific, not generic — reference actual JD details. Mix: team structure, eng culture, success metrics, tech decisions, growth path.

6. **Save**: Write to `interview-prep/<YYYY-MM-DD>_<Company>_<Role>_prep.md`.

7. **Report**: File path, count of ⚠️ skill gaps, top 3 behavioral questions to rehearse first.

## Rules

- Never fabricate resume content — only use what's in the resume file
- Use `[PLACEHOLDER]` for quantified results not in the resume
- Skill gaps (⚠️) are informational, not disqualifying — note them, don't catastrophize
- "Questions to ask" must reference specific JD details — no generic questions
