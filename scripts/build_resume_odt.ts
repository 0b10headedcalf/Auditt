/**
 * Build a tailored ODT resume by cloning a template ODT's exact XML structure.
 * Replaces only text content; all styles, fonts, spans, namespaces preserved.
 * Converts the output ODT to PDF via LibreOffice headless.
 *
 * Usage:
 *   bun run build_resume_odt.ts --template SWEBASE --slug 2026-05-05_maybern_forward-deployed-engineer
 *
 * --template  Case-insensitive partial match against filenames in ./Templates/
 * --slug      Output filename stem; written to ./Resumes/<slug>_resume.odt + .pdf
 *
 * Web-friendly: only fflate (works in browser) + Bun file I/O at the edges.
 * Swap Bun.file / Bun.write calls for fetch / File APIs to run in-browser.
 */

import { unzipSync, zipSync, strToU8, strFromU8 } from "fflate";
import { readdirSync } from "node:fs";
import { join } from "node:path";
import { execSync } from "node:child_process";

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
  return p("P3", span("T21", title));
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
      "Owned end-to-end deployment of six multiplayer XR systems serving 25+ concurrent users; published research validated 5% measurable improvement in outcomes across 4,000+ students, demonstrating impact-driven delivery.",
      "Designed autonomous agent behavior systems and physics-based ocean simulation for Wayfinders, a permanent interactive installation at Bishop Museum’s J. Watumull Planetarium (Honolulu); engineered for 10-year production lifespan with rigorous reliability requirements.",
      "Managed quantitative performance budgets through systematic CPU/GPU profiling and optimization across multiple real-time simulation systems; balanced speed, rigor, and hardware constraints in production deployments.",
    ],
    true
  ),

  // PROJECTS
  sectionHeader("PROJECTS"),

  projHeader("ML Pipeline for IBD Identification", "M.S. Capstone"),
  bulletList([
    "Built end-to-end analytical pipeline for microbiome sequencing data: ETL, Bayesian shrinkage regularization (horseshoe priors), polynomial curve fitting; engineered evaluation criteria to distinguish model signal from data leakage and validate system reliability.",
    "Designed structured validation and evaluation framework to surface model limitations and prevent false confidence — applicable to building reliable AI/ML systems in production.",
  ]),

  projHeader("ShaderWrap", "Full-Stack AI Developer Tool"),
  bulletList([
    "Designed and built an end-to-end LLM-powered developer tool: FastAPI/Python backend, Ollama local inference with cloud API fallback; architected human-in-the-loop workflow with evaluation layer for model output quality control.",
    "Fine-tuned Qwen2.5-Coder (14B params, 5-bit quantized) on curated domain-specific dataset; handled dataset curation, training, quantization, and Hugging Face deployment end-to-end.",
  ]),

  projHeader("Mixed-Wafer Defect Detection", "ML / Computer Vision"),
  bulletList([
    "Trained and evaluated a multi-class ML classifier for silicon wafer defect detection; built feature engineering pipeline and structured evaluation framework with rigorous validation criteria in Python.",
  ]),

  projHeader("Metagenomic Analysis Dashboard", ""),
  bulletList([
    "Led all engineering on a large-scale sequencing data pipeline on distributed HPC infrastructure (QIIME2, SLURM); translated ambiguous research requirements into deployed analytical system with interactive 3D phylogenetic tree and genomic embedding visualizations for cross-functional stakeholders.",
  ]),

  projHeaderAlt("Daileet", "DSA Study Tool"),
  bulletList([
    "Built Python tool with custom SQLite3 database and GraphQL API integration; implemented SM-2 spaced repetition algorithm and session-based authentication; designed custom API layer to abstract LeetCode’s GraphQL endpoints.",
  ]),

  projHeader("Stack Scraper", "Python Automation Tool"),
  bulletList([
    "Python automation pipeline for multi-source media ingestion: scrapes social content, transcribes video via AI speech recognition model inference, synthesizes structured documents; designed for extensibility and production reliability.",
  ]),

  // SKILLS
  sectionHeader("SKILLS"),
  skillLine("Languages", "Python, SQL, TypeScript, Go, Rust, C#, HLSL/GLSL; C/C++"),
  skillLine(
    "AI / ML",
    "PyTorch, LLM fine-tuning, model quantization, Ollama, LangGraph, multi-agent orchestration, evaluation frameworks, human-in-the-loop workflows"
  ),
  skillLine(
    "Backend / Data",
    "FastAPI, REST APIs, data pipeline architecture, ETL, scientific computing, HPC/SLURM"
  ),
  skillLine("Infrastructure", "Git, Docker, CI/CD, automated testing, Nextflow, Snakemake"),
  skillLine(
    "Graphics / Simulation",
    "Unity, URP, ShaderGraph, real-time rendering, shader development, GPU profiling"
  ),
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
console.log(`Written:  ${OUTPUT}`);

const outDir = join("./Resumes");
execSync(`libreoffice --headless --convert-to pdf --outdir "${outDir}" "${OUTPUT}"`, {
  stdio: "inherit",
});
const pdfPath = OUTPUT.replace(/\.odt$/, ".pdf");
console.log(`PDF:      ${pdfPath}`);
