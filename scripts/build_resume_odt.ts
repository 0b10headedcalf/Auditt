/**
 * Build a tailored ODT resume by cloning a template ODT's exact XML structure.
 * Replaces only text content; all styles, fonts, spans, namespaces preserved.
 *
 * Usage:
 *   bun run build_resume_odt.ts --template SWEBASE --slug 2026-05-04_honeywell_software-engineer-1
 *
 * --template  Case-insensitive partial match against filenames in ./Templates/
 * --slug      Output filename stem; written to ./Resumes/<slug>_resume.odt
 *
 * Web-friendly: only fflate (works in browser) + Bun file I/O at the edges.
 * Swap Bun.file / Bun.write calls for fetch / File APIs to run in-browser.
 */

import { unzipSync, zipSync, strToU8, strFromU8 } from "fflate";
import { readdirSync } from "node:fs";
import { join } from "node:path";

// ── CLI arg resolution ────────────────────────────────────────────────────────

function parseArgs(argv: string[]): Record<string, string> {
  const result: Record<string, string> = {};
  for (let i = 0; i < argv.length - 1; i++) {
    if (argv[i]?.startsWith("--")) {
      result[argv[i]!.slice(2)] = argv[i + 1]!;
    }
  }
  return result;
}

const args = parseArgs(process.argv.slice(2));

if (!args["template"] || !args["slug"]) {
  console.error("Usage: bun run build_resume_odt.ts --template <name> --slug <YYYY-MM-DD_company_role>");
  process.exit(1);
}

function resolveTemplate(partial: string): string {
  const dir = "./Templates";
  const lower = partial.toLowerCase();
  const match = readdirSync(dir).find(
    (f) => f.toLowerCase().includes(lower) && f.endsWith(".odt")
  );
  if (!match) {
    const available = readdirSync(dir).filter((f) => f.endsWith(".odt")).join(", ");
    console.error(`No template matching "${partial}". Available: ${available}`);
    process.exit(1);
  }
  return join(dir, match);
}

const TEMPLATE = resolveTemplate(args["template"]!);
const OUTPUT = join("./Resumes", `${args["slug"]}_resume.odt`);

console.log(`Template: ${TEMPLATE}`);
console.log(`Output:   ${OUTPUT}`);

// ── XML helpers ───────────────────────────────────────────────────────────────

function esc(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function span(style: string, text: string): string {
  if (!text) return `<text:span text:style-name="${style}"/>`;
  return `<text:span text:style-name="${style}">${esc(text)}</text:span>`;
}

function p(style: string, ...spans: string[]): string {
  return `<text:p text:style-name="${style}">${spans.join("")}</text:p>`;
}

function sectionHeader(title: string): string {
  return p("P3", span("T21", title), span("T25", ""));
}

function eduRow(institution: string, date: string): string {
  return (
    `<text:p text:style-name="P4">` +
    span("T23", institution) +
    `<text:span text:style-name="T24"><text:tab/>${esc(date)}</text:span>` +
    `</text:p>`
  );
}

function eduDetail(text: string): string {
  return p("P5", span("T24", text), span("T24", ""));
}

function expHeader(title: string, locationDate: string): string {
  return (
    `<text:p text:style-name="P4">` +
    span("T26", title) +
    `<text:span text:style-name="T24"><text:tab/>${esc(locationDate)}</text:span>` +
    `</text:p>`
  );
}

function projHeader(name: string, context: string): string {
  return p("P4", span("T26", name), span("T29", context ? ` ${context}` : " "));
}

function projHeaderAlt(name: string, subtitle: string): string {
  return p("P7", span("T30", `${name} `), span("T27", subtitle));
}

function bulletList(items: string[], first = false): string {
  const cont = first ? "" : ` text:continue-numbering="true"`;
  const listItems = items
    .map(
      (item) =>
        `<text:list-item>` +
        `<text:p text:style-name="P6">` +
        span("T27", item) +
        span("T28", "") +
        `</text:p>` +
        `</text:list-item>`
    )
    .join("");
  return `<text:list${cont} text:style-name="WWNum1">${listItems}</text:list>`;
}

function skillLine(label: string, values: string): string {
  return p("P9", span("T30", `${label}: `), span("T27", values));
}

// ── Resume content ────────────────────────────────────────────────────────────

const SEQ_DECLS =
  `<text:sequence-decls>` +
  `<text:sequence-decl text:display-outline-level="0" text:name="Illustration"/>` +
  `<text:sequence-decl text:display-outline-level="0" text:name="Table"/>` +
  `<text:sequence-decl text:display-outline-level="0" text:name="Text"/>` +
  `<text:sequence-decl text:display-outline-level="0" text:name="Drawing"/>` +
  `<text:sequence-decl text:display-outline-level="0" text:name="Figure"/>` +
  `</text:sequence-decls>`;

const CONTACT_LINE =
  `<text:p text:style-name="P2">` +
  `<text:span text:style-name="T20">` +
  `dc2000a@gmail.com <text:s/> | <text:s/> +1 480-353-1378 <text:s/> | <text:s/> 0b10headedcalf.dev ` +
  `</text:span>` +
  `<text:span text:style-name="T20"/>` +
  `</text:p>`;

const blocks: string[] = [
  SEQ_DECLS,

  // Header
  p("P1", span("T19", "­Darrell Cheng")),
  CONTACT_LINE,

  // EDUCATION
  sectionHeader("EDUCATION"),
  eduRow("Arizona State University", "July 2025"),
  eduDetail("M.S. Computational Life Sciences"),
  eduDetail("B.S. Sustainability | Minor: Business"),

  // EXPERIENCE
  sectionHeader("EXPERIENCE"),
  expHeader(
    "XR Software Developer – Arizona State University EdPlus",
    "Scottsdale, AZ | 2022 – 2025"
  ),
  bulletList(
    [
      "Designed, developed, and tested graphics and simulation software for six multiplayer XR " +
        "applications integrated into ASU curricula; validated performance across 25+ concurrent " +
        "users, with published research confirming 5% STEM retention improvement across 4,000+ students.",
      "Engineered real-time simulation systems (water physics, foliage decay, particle VFX) under " +
        "strict performance budgets; conducted CPU/GPU profiling on target hardware to meet quality " +
        "and latency standards.",
      "Collaborated cross-functionally with educators, researchers, and engineers to gather " +
        "requirements and deliver software solutions aligned to customer specifications.",
      "Built autonomous agent behavior system and ocean simulation for a permanent public installation " +
        "at Bishop Museum’s J. Watumull Planetarium; engineered and documented for a 10-year " +
        "operational lifespan.",
    ],
    true
  ),

  // PROJECTS
  sectionHeader("PROJECTS"),

  projHeader("Mixed-Wafer Defect Detection", "ML / Computer Vision"),
  bulletList([
    "Implemented a multi-class ML classifier for silicon wafer defect detection; designed " +
      "structured feature engineering and evaluation pipelines in Python, applying analytical " +
      "problem-solving to an industrial quality assurance domain.",
  ]),

  projHeader("ShaderWrap", "Full-Stack AI Developer Tool"),
  bulletList([
    "Owned the full software development lifecycle: designed FastAPI/Python backend, implemented " +
      "inference pipeline, curated training datasets, and deployed a fine-tuned 14B-parameter LLM " +
      "(Qwen2.5-Coder) end-to-end; iterated using Agile cycles to ship a working product.",
  ]),

  projHeaderAlt("Daileet", "DSA Study Tool"),
  bulletList([
    "Designed a custom REST API interfacing with LeetCode’s GraphQL to retrieve user data " +
      "and persist to SQLite3; implemented SM-2 spaced repetition algorithm with a terminal UI, " +
      "applying software design principles throughout.",
  ]),

  projHeader("Stack Scraper", "Python Automation Tool"),
  bulletList([
    "Built a modular Python pipeline for multi-source media ingestion, AI speech transcription, " +
      "and structured document synthesis; designed for maintainability and extensibility.",
  ]),

  projHeader("ML Pipeline for IBD Identification", "M.S. Capstone"),
  bulletList([
    "End-to-end pipeline for microbiome sequencing data: ETL, Bayesian shrinkage regularization " +
      "(horseshoe priors), polynomial curve fitting; evaluation criteria engineered to distinguish " +
      "model signal from data leakage.",
  ]),

  projHeader("Metagenomic Analysis Dashboard", ""),
  bulletList([
    "Led all engineering on a large-scale sequencing data pipeline on distributed HPC infrastructure " +
      "(QIIME2, SLURM); built interactive 3D visualizations for cross-functional research collaboration.",
  ]),

  // SKILLS
  sectionHeader("SKILLS"),
  skillLine("Languages", "C/C++, Python, C#, TypeScript, Go, SQL, Rust, HLSL/GLSL"),
  skillLine(
    "Software Engineering",
    "Agile development, code review, technical documentation, software testing, CI/CD"
  ),
  skillLine(
    "AI / ML",
    "PyTorch, LLM fine-tuning, model quantization, Ollama, LangGraph, multi-agent orchestration"
  ),
  skillLine(
    "Backend / Data",
    "FastAPI, REST APIs, data pipeline architecture, scientific computing, HPC/SLURM"
  ),
  skillLine("Infrastructure", "Git, Docker, Nextflow, Snakemake, automated testing"),
];

const newBody = `<office:text>${blocks.join("")}</office:text>`;

// ── Splice into content.xml and repack ───────────────────────────────────────

const templateBytes = new Uint8Array(await Bun.file(TEMPLATE).arrayBuffer());
const files = unzipSync(templateBytes);

const contentXml = strFromU8(files["content.xml"]!);
const patched = contentXml.replace(
  /<office:text>[\s\S]*?<\/office:text>/,
  newBody
);

files["content.xml"] = strToU8(patched);

// mimetype must be first and uncompressed; fflate uses [data, opts] tuple per file
const { mimetype, ...rest } = files;
const zipped = zipSync({
  mimetype: [mimetype!, { level: 0 }],
  ...Object.fromEntries(
    Object.entries(rest).map(([k, v]) => [k, [v, { level: 6 }] as const])
  ),
});

await Bun.write(OUTPUT, zipped);
console.log(`Written: ${OUTPUT}`);
