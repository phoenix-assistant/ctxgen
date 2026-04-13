import { readFileSync, existsSync } from "fs";
import { join } from "path";
import { glob } from "glob";

export interface ProjectInfo {
  // Language/runtime
  languages: string[];
  primaryLanguage: string;
  // Framework
  framework: string | null;
  // Package manager
  packageManager: string | null;
  // Test framework
  testFramework: string | null;
  // Linter
  linter: string | null;
  // CI
  ci: string | null;
  // Build tool
  buildTool: string | null;
  // Project name
  name: string;
  // Description
  description: string;
  // Detected conventions
  conventions: string[];
  // File structure hints
  hasSrc: boolean;
  hasTests: boolean;
  hasDocs: boolean;
  // Extra metadata
  nodeVersion?: string | undefined;
  pythonVersion?: string | undefined;
  goVersion?: string | undefined;
  rustEdition?: string | undefined;
}

function readFileSafe(path: string): string | null {
  try {
    return readFileSync(path, "utf8");
  } catch {
    return null;
  }
}

function parseJSON<T>(content: string): T | null {
  try {
    return JSON.parse(content) as T;
  } catch {
    return null;
  }
}

interface PackageJson {
  name?: string;
  description?: string;
  engines?: { node?: string };
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
  scripts?: Record<string, string>;
}

export async function analyzeProject(cwd: string): Promise<ProjectInfo> {
  const languages: string[] = [];
  let primaryLanguage = "unknown";
  let framework: string | null = null;
  let packageManager: string | null = null;
  let testFramework: string | null = null;
  let linter: string | null = null;
  let ci: string | null = null;
  let buildTool: string | null = null;
  let name = "project";
  let description = "";
  const conventions: string[] = [];

  // Check file existence for structure
  const hasSrc = existsSync(join(cwd, "src"));
  const hasTests =
    existsSync(join(cwd, "tests")) ||
    existsSync(join(cwd, "test")) ||
    existsSync(join(cwd, "__tests__"));
  const hasDocs =
    existsSync(join(cwd, "docs")) || existsSync(join(cwd, "doc"));

  // === Node.js / TypeScript ===
  const pkgJsonContent = readFileSafe(join(cwd, "package.json"));
  const pkgJson = pkgJsonContent
    ? parseJSON<PackageJson>(pkgJsonContent)
    : null;

  if (pkgJson) {
    languages.push("JavaScript");
    primaryLanguage = "JavaScript";
    name = pkgJson.name?.replace(/^@[^/]+\//, "") ?? "project";
    description = pkgJson.description ?? "";

    const deps = {
      ...(pkgJson.dependencies ?? {}),
      ...(pkgJson.devDependencies ?? {}),
    };

    // TypeScript
    if (deps["typescript"] !== undefined || existsSync(join(cwd, "tsconfig.json"))) {
      languages.push("TypeScript");
      primaryLanguage = "TypeScript";
    }

    // Package manager
    if (existsSync(join(cwd, "pnpm-lock.yaml"))) packageManager = "pnpm";
    else if (existsSync(join(cwd, "yarn.lock"))) packageManager = "yarn";
    else if (existsSync(join(cwd, "bun.lockb"))) packageManager = "bun";
    else if (existsSync(join(cwd, "package-lock.json"))) packageManager = "npm";
    else packageManager = "npm";

    // Framework detection
    if (deps["next"] !== undefined) framework = "Next.js";
    else if (deps["nuxt"] !== undefined) framework = "Nuxt";
    else if (deps["@remix-run/node"] !== undefined) framework = "Remix";
    else if (deps["react"] !== undefined) framework = "React";
    else if (deps["vue"] !== undefined) framework = "Vue";
    else if (deps["svelte"] !== undefined) framework = "Svelte";
    else if (deps["express"] !== undefined) framework = "Express";
    else if (deps["fastify"] !== undefined) framework = "Fastify";
    else if (deps["hono"] !== undefined) framework = "Hono";
    else if (deps["@nestjs/core"] !== undefined) framework = "NestJS";

    // Test framework
    if (deps["vitest"] !== undefined) testFramework = "Vitest";
    else if (deps["jest"] !== undefined) testFramework = "Jest";
    else if (deps["mocha"] !== undefined) testFramework = "Mocha";
    else if (deps["ava"] !== undefined) testFramework = "Ava";

    // Linter
    if (deps["eslint"] !== undefined) {
      linter = "ESLint";
      if (deps["prettier"] !== undefined) linter = "ESLint + Prettier";
    } else if (deps["biome"] !== undefined) {
      linter = "Biome";
    } else if (deps["prettier"] !== undefined) {
      linter = "Prettier";
    }

    // Build tool
    if (deps["tsup"] !== undefined) buildTool = "tsup";
    else if (deps["vite"] !== undefined) buildTool = "Vite";
    else if (deps["webpack"] !== undefined) buildTool = "Webpack";
    else if (deps["esbuild"] !== undefined) buildTool = "esbuild";
    else if (deps["rollup"] !== undefined) buildTool = "Rollup";
    else if (deps["turbo"] !== undefined) buildTool = "Turborepo";

    // Convention detection from scripts
    const scripts = pkgJson.scripts ?? {};
    if (scripts["test"] !== undefined) conventions.push("Has test script");
    if (scripts["lint"] !== undefined) conventions.push("Has lint script");
    if (scripts["build"] !== undefined) conventions.push("Has build script");
    if (pkgJson.engines?.node !== undefined) {
      // nodeVersion is set below
    }
  }

  // === Python ===
  const pyprojectContent = readFileSafe(join(cwd, "pyproject.toml"));
  const requirementsContent = readFileSafe(join(cwd, "requirements.txt"));
  const setupPyContent = readFileSafe(join(cwd, "setup.py"));

  if (pyprojectContent ?? requirementsContent ?? setupPyContent) {
    languages.push("Python");
    if (primaryLanguage === "unknown") primaryLanguage = "Python";

    // Package manager
    if (pyprojectContent) {
      if (pyprojectContent.includes("[tool.poetry]")) packageManager = "Poetry";
      else if (pyprojectContent.includes("[tool.pdm]")) packageManager = "PDM";
      else if (pyprojectContent.includes("[tool.hatch]")) packageManager = "Hatch";
      else packageManager = "pip";

      // Framework
      if (pyprojectContent.includes("fastapi") || requirementsContent?.includes("fastapi"))
        framework = "FastAPI";
      else if (pyprojectContent.includes("django") || requirementsContent?.includes("django"))
        framework = "Django";
      else if (pyprojectContent.includes("flask") || requirementsContent?.includes("flask"))
        framework = "Flask";

      // Test framework
      if (pyprojectContent.includes("pytest") || requirementsContent?.includes("pytest"))
        testFramework = "pytest";

      // Linter
      if (pyprojectContent.includes("ruff")) linter = "Ruff";
      else if (pyprojectContent.includes("flake8") || requirementsContent?.includes("flake8"))
        linter = "Flake8";
    }
  }

  // === Go ===
  const goModContent = readFileSafe(join(cwd, "go.mod"));
  if (goModContent) {
    languages.push("Go");
    if (primaryLanguage === "unknown") primaryLanguage = "Go";
    packageManager = "Go modules";

    const goVersionMatch = /^go\s+([\d.]+)/m.exec(goModContent);
    const goVersion = goVersionMatch?.[1];

    if (goModContent.includes("github.com/gin-gonic/gin")) framework = "Gin";
    else if (goModContent.includes("github.com/labstack/echo")) framework = "Echo";
    else if (goModContent.includes("github.com/gofiber/fiber")) framework = "Fiber";

    testFramework = "testing (stdlib)";
    buildTool = "go build";

    if (goVersion) {
      conventions.push(`Go ${goVersion}`);
    }
  }

  // === Rust ===
  const cargoContent = readFileSafe(join(cwd, "Cargo.toml"));
  if (cargoContent) {
    languages.push("Rust");
    if (primaryLanguage === "unknown") primaryLanguage = "Rust";
    packageManager = "Cargo";
    testFramework = "cargo test";
    buildTool = "cargo build";

    if (cargoContent.includes("actix-web")) framework = "Actix Web";
    else if (cargoContent.includes("axum")) framework = "Axum";
    else if (cargoContent.includes("rocket")) framework = "Rocket";

    const nameMatch = /^\[package\][\s\S]*?name\s*=\s*"([^"]+)"/m.exec(cargoContent);
    if (nameMatch?.[1]) name = nameMatch[1];
  }

  // === CI detection ===
  if (existsSync(join(cwd, ".github/workflows"))) ci = "GitHub Actions";
  else if (existsSync(join(cwd, ".circleci"))) ci = "CircleCI";
  else if (existsSync(join(cwd, ".travis.yml"))) ci = "Travis CI";
  else if (existsSync(join(cwd, "Jenkinsfile"))) ci = "Jenkins";
  else if (existsSync(join(cwd, ".gitlab-ci.yml"))) ci = "GitLab CI";

  // === Conventions from source files ===
  const tsFiles = await glob("src/**/*.ts", { cwd, ignore: ["**/*.d.ts"] });
  if (tsFiles.length > 0) {
    conventions.push("TypeScript source in src/");
  }

  // Check for common patterns
  if (existsSync(join(cwd, "CONTRIBUTING.md"))) {
    conventions.push("Has CONTRIBUTING.md");
  }
  if (existsSync(join(cwd, ".editorconfig"))) {
    conventions.push("Uses EditorConfig");
  }
  if (existsSync(join(cwd, "CHANGELOG.md"))) {
    conventions.push("Maintains CHANGELOG");
  }

  // Conventional commits detection
  const commitlintConfig =
    existsSync(join(cwd, ".commitlintrc.json")) ||
    existsSync(join(cwd, ".commitlintrc.js")) ||
    existsSync(join(cwd, "commitlint.config.js"));
  if (commitlintConfig) {
    conventions.push("Conventional Commits");
  }

  return {
    languages,
    primaryLanguage,
    framework,
    packageManager,
    testFramework,
    linter,
    ci,
    buildTool,
    name,
    description,
    conventions,
    hasSrc,
    hasTests,
    hasDocs,
    nodeVersion: pkgJson?.engines?.node,
  };
}
