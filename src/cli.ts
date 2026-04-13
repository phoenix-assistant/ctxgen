import { Command } from "commander";
import { readFileSync, writeFileSync, existsSync, mkdirSync } from "fs";
import { join, dirname, basename } from "path";
import pc from "picocolors";
import { analyzeProject } from "./analyzer/index.js";
import { generate, getOutputFilename } from "./generators/index.js";
import { lintFile } from "./linter/index.js";
import type { OutputFormat } from "./generators/index.js";

const TOKEN_WARN_THRESHOLD = 2000;

function countTokens(text: string): number {
  return Math.ceil(text.length / 4);
}

function formatScore(score: number): string {
  if (score >= 80) return pc.green(String(score));
  if (score >= 60) return pc.yellow(String(score));
  return pc.red(String(score));
}

const program = new Command();

program
  .name("ctxgen")
  .description("Generate and lint CLAUDE.md / AGENTS.md / .cursorrules / copilot-instructions.md")
  .version("0.1.0");

// ── ctxgen init ──────────────────────────────────────────────────────────────
program
  .command("init")
  .description("Scan codebase and generate a context file")
  .option(
    "-f, --format <format>",
    "Output format: claude|agents|cursor|copilot",
    "claude"
  )
  .option("-o, --output <path>", "Custom output path")
  .option("--dry-run", "Print output without writing to disk")
  .option("--cwd <path>", "Working directory to scan", process.cwd())
  .action(async (opts: { format: string; output?: string; dryRun?: boolean; cwd: string }) => {
    const format = opts.format as OutputFormat;
    const validFormats: OutputFormat[] = ["claude", "agents", "cursor", "copilot"];
    if (!validFormats.includes(format)) {
      console.error(pc.red(`Invalid format: ${format}. Choose: ${validFormats.join(", ")}`));
      process.exit(1);
    }

    console.log(pc.cyan("🔍 Scanning codebase..."));

    const projectInfo = await analyzeProject(opts.cwd);

    console.log(pc.dim(`  Language:  ${projectInfo.primaryLanguage}`));
    if (projectInfo.framework) console.log(pc.dim(`  Framework: ${projectInfo.framework}`));
    if (projectInfo.packageManager)
      console.log(pc.dim(`  Packages:  ${projectInfo.packageManager}`));
    if (projectInfo.testFramework)
      console.log(pc.dim(`  Tests:     ${projectInfo.testFramework}`));
    if (projectInfo.linter) console.log(pc.dim(`  Linter:    ${projectInfo.linter}`));

    const content = generate({ format, projectInfo });
    const tokens = countTokens(content);

    if (tokens > TOKEN_WARN_THRESHOLD) {
      console.warn(
        pc.yellow(
          `\n⚠️  Output is ~${String(tokens)} tokens (>${String(TOKEN_WARN_THRESHOLD)}). Consider trimming for smaller context windows.\n`
        )
      );
    }

    if (opts.dryRun === true) {
      console.log(pc.bold("\n── Generated Content ──────────────────\n"));
      console.log(content);
      console.log(pc.bold("\n───────────────────────────────────────"));
      console.log(pc.dim(`\n~${String(tokens)} tokens`));
      return;
    }

    const outputPath = opts.output ?? join(opts.cwd, getOutputFilename(format));
    const outputDir = dirname(outputPath);
    if (!existsSync(outputDir)) {
      mkdirSync(outputDir, { recursive: true });
    }

    writeFileSync(outputPath, content, "utf8");
    console.log(pc.green(`\n✅ Generated ${basename(outputPath)}`));
    console.log(pc.dim(`   Path: ${outputPath}`));
    console.log(pc.dim(`   ~${String(tokens)} tokens`));
  });

// ── ctxgen lint ──────────────────────────────────────────────────────────────
program
  .command("lint [file]")
  .description("Score an existing context file (0-100)")
  .option("--cwd <path>", "Working directory", process.cwd())
  .action((file: string | undefined, opts: { cwd: string }) => {
    // Determine which file to lint
    const candidates = [
      file,
      join(opts.cwd, "CLAUDE.md"),
      join(opts.cwd, "AGENTS.md"),
      join(opts.cwd, ".cursorrules"),
      join(opts.cwd, ".github/copilot-instructions.md"),
    ].filter(Boolean) as string[];

    const target = candidates.find((f) => existsSync(f));
    if (!target) {
      console.error(
        pc.red(
          "No context file found. Specify a file or run `ctxgen init` first."
        )
      );
      process.exit(1);
    }

    const content = readFileSync(target, "utf8");
    const result = lintFile(content);

    console.log(pc.bold(`\n📊 Linting: ${basename(target)}\n`));

    for (const check of result.checks) {
      const icon = check.passed ? pc.green("✓") : pc.red("✗");
      const scoreStr = `${String(check.score)}/${String(check.maxScore)}`;
      console.log(
        `  ${icon} ${pc.bold(check.name.padEnd(20))} ${pc.dim(scoreStr.padStart(5))}  ${check.message}`
      );
    }

    console.log("");
    console.log(
      `  ${"Score:".padEnd(22)} ${formatScore(result.score)}/100`
    );

    if (result.suggestions.length > 0) {
      console.log(pc.bold("\n💡 Suggestions:\n"));
      for (const s of result.suggestions) {
        console.log(`  ${s}`);
      }
    }
    console.log("");
  });

// ── ctxgen update ────────────────────────────────────────────────────────────
program
  .command("update")
  .description("Re-scan and update existing context file (preserves manual edits)")
  .option("-f, --format <format>", "Format override: claude|agents|cursor|copilot")
  .option("--cwd <path>", "Working directory", process.cwd())
  .action(async (opts: { format?: string; cwd: string }) => {
    // Detect existing file
    const formatFileMap: Record<OutputFormat, string> = {
      claude: "CLAUDE.md",
      agents: "AGENTS.md",
      cursor: ".cursorrules",
      copilot: ".github/copilot-instructions.md",
    };

    let detectedFormat: OutputFormat = "claude";
    let existingPath: string | null = null;

    for (const [fmt, filename] of Object.entries(formatFileMap)) {
      const p = join(opts.cwd, filename);
      if (existsSync(p)) {
        detectedFormat = fmt as OutputFormat;
        existingPath = p;
        break;
      }
    }

    const format = (opts.format as OutputFormat | undefined) ?? detectedFormat;

    if (!existingPath) {
      console.log(
        pc.yellow("No existing context file found. Running `init` instead...")
      );
    }

    console.log(pc.cyan("🔍 Re-scanning codebase..."));
    const projectInfo = await analyzeProject(opts.cwd);
    const newContent = generate({ format, projectInfo });

    // Merge: if existing file has a custom "## Notes" section, preserve it
    let finalContent = newContent;
    if (existingPath) {
      const existing = readFileSync(existingPath, "utf8");
      const notesMatch = /^## Notes\b[\s\S]*$/m.exec(existing);
      if (notesMatch) {
        finalContent = `${newContent.trimEnd()}\n\n${notesMatch[0]}`;
        console.log(pc.dim("  Preserved custom ## Notes section"));
      }
    }

    const outputPath = existingPath ?? join(opts.cwd, getOutputFilename(format));
    writeFileSync(outputPath, finalContent, "utf8");
    console.log(pc.green(`\n✅ Updated ${basename(outputPath)}`));

    const tokens = countTokens(finalContent);
    if (tokens > TOKEN_WARN_THRESHOLD) {
      console.warn(
        pc.yellow(`⚠️  Output is ~${String(tokens)} tokens (>${String(TOKEN_WARN_THRESHOLD)}).`)
      );
    } else {
      console.log(pc.dim(`   ~${String(tokens)} tokens`));
    }
  });

// ── ctxgen diff ──────────────────────────────────────────────────────────────
program
  .command("diff")
  .description("Dry run of update — show what would change")
  .option("-f, --format <format>", "Format override: claude|agents|cursor|copilot")
  .option("--cwd <path>", "Working directory", process.cwd())
  .action(async (opts: { format?: string; cwd: string }) => {
    const formatFileMap: Record<OutputFormat, string> = {
      claude: "CLAUDE.md",
      agents: "AGENTS.md",
      cursor: ".cursorrules",
      copilot: ".github/copilot-instructions.md",
    };

    let detectedFormat: OutputFormat = "claude";
    let existingPath: string | null = null;
    let existingContent: string | null = null;

    for (const [fmt, filename] of Object.entries(formatFileMap)) {
      const p = join(opts.cwd, filename);
      if (existsSync(p)) {
        detectedFormat = fmt as OutputFormat;
        existingPath = p;
        existingContent = readFileSync(p, "utf8");
        break;
      }
    }

    const format = (opts.format as OutputFormat | undefined) ?? detectedFormat;

    console.log(pc.cyan("🔍 Scanning codebase..."));
    const projectInfo = await analyzeProject(opts.cwd);
    const newContent = generate({ format, projectInfo });

    if (!existingContent) {
      console.log(
        pc.yellow(`\nNo existing file found. Would create: ${getOutputFilename(format)}\n`)
      );
      console.log(newContent);
      return;
    }

    if (newContent === existingContent) {
      console.log(pc.green(`\n✅ No changes — ${basename(existingPath ?? "")} is up to date.`));
      return;
    }

    // Simple line-level diff
    const oldLines = existingContent.split("\n");
    const newLines = newContent.split("\n");

    console.log(
      pc.bold(
        `\n── Diff: ${basename(existingPath ?? "")} ──────────────────\n`
      )
    );

    const maxLen = Math.max(oldLines.length, newLines.length);
    let changes = 0;

    for (let i = 0; i < maxLen; i++) {
      const oldLine = oldLines[i];
      const newLine = newLines[i];

      if (oldLine === undefined && newLine !== undefined) {
        console.log(pc.green(`+ ${newLine}`));
        changes++;
      } else if (newLine === undefined && oldLine !== undefined) {
        console.log(pc.red(`- ${oldLine}`));
        changes++;
      } else if (oldLine !== newLine) {
        if (oldLine !== undefined) console.log(pc.red(`- ${oldLine}`));
        if (newLine !== undefined) console.log(pc.green(`+ ${newLine}`));
        changes++;
      }
    }

    console.log(pc.dim(`\n${String(changes)} line(s) changed`));
  });

program.parse();
