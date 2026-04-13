import type { ProjectInfo } from "../analyzer/index.js";

export type OutputFormat = "claude" | "agents" | "cursor" | "copilot";

export interface GeneratorOptions {
  format: OutputFormat;
  projectInfo: ProjectInfo;
  projectName?: string;
}

const PRINCIPLES = `## Core Principles

Follow these principles in all code you write:
- **DRY** (Don't Repeat Yourself): Extract reusable logic into functions/modules
- **KISS** (Keep It Simple, Stupid): Prefer simple, readable solutions over clever ones
- **YAGNI** (You Aren't Gonna Need It): Don't add features until they're needed
- **SOLID**: Follow Single Responsibility, Open/Closed, Liskov Substitution, Interface Segregation, Dependency Inversion
- **TDD**: Write tests before or alongside implementation; all new features need tests`;

function getLanguageRules(info: ProjectInfo): string {
  const lines: string[] = [];

  if (info.primaryLanguage === "TypeScript") {
    lines.push("## TypeScript Rules");
    lines.push("");
    lines.push("- Use strict TypeScript (`strict: true` in tsconfig)");
    lines.push("- Prefer `interface` over `type` for object shapes");
    lines.push("- Always type function return values explicitly");
    lines.push("- No `any` — use `unknown` and narrow with guards");
    lines.push("- Use ES modules (`import`/`export`), not CommonJS");
    if (info.framework === "React") {
      lines.push("- Prefer functional components with hooks over class components");
      lines.push("- Use React.FC only when children prop is needed");
    }
  } else if (info.primaryLanguage === "Python") {
    lines.push("## Python Rules");
    lines.push("");
    lines.push("- Use type hints on all function signatures");
    lines.push("- Prefer dataclasses or Pydantic models over raw dicts");
    lines.push("- Use f-strings for string formatting");
    lines.push("- Follow PEP 8 conventions");
    if (info.framework === "FastAPI") {
      lines.push("- Use async/await for all route handlers");
      lines.push("- Define request/response models with Pydantic");
    }
  } else if (info.primaryLanguage === "Go") {
    lines.push("## Go Rules");
    lines.push("");
    lines.push("- Handle errors explicitly — never ignore returned errors");
    lines.push("- Use `context.Context` as the first param in functions that do I/O");
    lines.push("- Prefer table-driven tests");
    lines.push("- Keep interfaces small (1-3 methods)");
  } else if (info.primaryLanguage === "Rust") {
    lines.push("## Rust Rules");
    lines.push("");
    lines.push("- Use `?` operator for error propagation");
    lines.push("- Prefer `Result<T, E>` over panicking");
    lines.push("- Avoid `unwrap()` in production code — use proper error handling");
    lines.push("- Keep ownership clear; document lifetime requirements");
  }

  return lines.join("\n");
}

function getToolingSection(info: ProjectInfo): string {
  const lines: string[] = ["## Tooling"];
  lines.push("");

  if (info.packageManager) {
    lines.push(`- **Package manager**: ${info.packageManager}`);
  }
  if (info.buildTool) {
    lines.push(`- **Build**: ${info.buildTool}`);
  }
  if (info.testFramework) {
    lines.push(`- **Tests**: ${info.testFramework}`);
  }
  if (info.linter) {
    lines.push(`- **Linter**: ${info.linter}`);
  }
  if (info.ci) {
    lines.push(`- **CI**: ${info.ci}`);
  }

  lines.push("");
  if (info.packageManager === "pnpm") {
    lines.push("Use `pnpm` for all package operations — never `npm` or `yarn`.");
  } else if (info.packageManager === "yarn") {
    lines.push("Use `yarn` for all package operations — never `npm`.");
  }

  return lines.join("\n");
}

function getTestingSection(info: ProjectInfo): string {
  const lines: string[] = ["## Testing"];
  lines.push("");

  if (info.testFramework) {
    lines.push(`Use ${info.testFramework} for all tests.`);
  }
  lines.push("- Write tests alongside implementation (TDD preferred)");
  lines.push("- Test behavior, not implementation details");
  lines.push("- Use descriptive test names: `it('should return error when input is empty')`");
  if (info.hasSrc && info.hasTests) {
    lines.push("- Mirror `src/` structure in `tests/`");
  }

  return lines.join("\n");
}

function generateClaude(info: ProjectInfo): string {
  const sections: string[] = [];
  const fw = info.framework ? ` (${info.framework})` : "";

  sections.push(`# ${info.name}`);
  sections.push("");
  if (info.description) {
    sections.push(info.description);
    sections.push("");
  }
  sections.push(
    `**Stack**: ${info.primaryLanguage}${fw}${info.packageManager ? ` · ${info.packageManager}` : ""}`
  );
  sections.push("");

  sections.push(PRINCIPLES);
  sections.push("");

  const langRules = getLanguageRules(info);
  if (langRules) {
    sections.push(langRules);
    sections.push("");
  }

  sections.push(getToolingSection(info));
  sections.push("");

  sections.push(getTestingSection(info));
  sections.push("");

  sections.push("## Project Structure");
  sections.push("");
  if (info.hasSrc) sections.push("- `src/` — source code");
  if (info.hasTests) sections.push("- `tests/` — test files");
  if (info.hasDocs) sections.push("- `docs/` — documentation");
  sections.push("");

  if (info.conventions.length > 0) {
    sections.push("## Conventions");
    sections.push("");
    for (const c of info.conventions) {
      sections.push(`- ${c}`);
    }
    sections.push("");
  }

  sections.push("## What NOT To Do");
  sections.push("");
  sections.push("- Do not add dependencies without asking first");
  sections.push("- Do not change existing API contracts without discussion");
  sections.push("- Do not skip error handling");
  sections.push("- Do not commit secrets or credentials");

  return sections.join("\n");
}

function generateAgents(info: ProjectInfo): string {
  const fw = info.framework ? ` with ${info.framework}` : "";
  const lines: string[] = [
    `# Agent Guidelines for ${info.name}`,
    "",
    `This is a ${info.primaryLanguage}${fw} project.`,
    "",
    "## Allowed Actions",
    "",
    "- Read and modify files in `src/`",
    "- Run tests, linter, and type-checker",
    "- Install dependencies with approval",
    "",
    "## Prohibited Actions",
    "",
    "- Do not run `rm -rf` or destructive shell commands",
    "- Do not modify `.env` files or credentials",
    "- Do not push to remote without explicit instruction",
    "- Do not change CI/CD configuration without review",
    "",
    PRINCIPLES,
    "",
    getLanguageRules(info),
    "",
    getToolingSection(info),
    "",
    getTestingSection(info),
  ];

  return lines.join("\n");
}

function generateCursor(info: ProjectInfo): string {
  const fw = info.framework ? ` ${info.framework}` : "";
  const lines: string[] = [
    `You are an expert ${info.primaryLanguage}${fw} developer.`,
    "",
    "## Coding Standards",
    "",
  ];

  const langRules = getLanguageRules(info);
  if (langRules) {
    lines.push(langRules);
    lines.push("");
  }

  lines.push(PRINCIPLES);
  lines.push("");
  lines.push(getToolingSection(info));
  lines.push("");
  lines.push(getTestingSection(info));
  lines.push("");
  lines.push("## Response Style");
  lines.push("");
  lines.push("- Be concise — explain only what changed and why");
  lines.push("- Always show the full modified file or function");
  lines.push("- Highlight breaking changes");

  return lines.join("\n");
}

function generateCopilot(info: ProjectInfo): string {
  const fw = info.framework ? ` (${info.framework})` : "";
  const lines: string[] = [
    `# GitHub Copilot Instructions for ${info.name}`,
    "",
    `This repository contains ${info.primaryLanguage}${fw} code.`,
    "",
    PRINCIPLES,
    "",
    getLanguageRules(info),
    "",
    getToolingSection(info),
    "",
    getTestingSection(info),
    "",
    "## Pull Request Guidelines",
    "",
    "- Keep PRs focused and small",
    "- Always add/update tests for changed behavior",
    "- Update documentation if public API changes",
  ];

  return lines.join("\n");
}

export function generate(options: GeneratorOptions): string {
  const { format, projectInfo } = options;
  switch (format) {
    case "claude":
      return generateClaude(projectInfo);
    case "agents":
      return generateAgents(projectInfo);
    case "cursor":
      return generateCursor(projectInfo);
    case "copilot":
      return generateCopilot(projectInfo);
  }
}

export function getOutputFilename(format: OutputFormat): string {
  switch (format) {
    case "claude":
      return "CLAUDE.md";
    case "agents":
      return "AGENTS.md";
    case "cursor":
      return ".cursorrules";
    case "copilot":
      return ".github/copilot-instructions.md";
  }
}
