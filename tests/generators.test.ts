import { describe, it, expect } from "vitest";
import { generate } from "../src/generators/index.js";
import type { ProjectInfo } from "../src/analyzer/index.js";

const baseProject: ProjectInfo = {
  languages: ["TypeScript"],
  primaryLanguage: "TypeScript",
  framework: "React",
  packageManager: "pnpm",
  testFramework: "Vitest",
  linter: "ESLint",
  ci: "GitHub Actions",
  buildTool: "tsup",
  name: "my-app",
  description: "A test app",
  conventions: ["TypeScript source in src/"],
  hasSrc: true,
  hasTests: true,
  hasDocs: false,
};

describe("generators", () => {
  it("should generate CLAUDE.md with project name", () => {
    const output = generate({ format: "claude", projectInfo: baseProject });
    expect(output).toContain("my-app");
    expect(output).toContain("TypeScript");
  });

  it("should include DRY/KISS/SOLID principles", () => {
    const output = generate({ format: "claude", projectInfo: baseProject });
    expect(output).toContain("DRY");
    expect(output).toContain("KISS");
    expect(output).toContain("SOLID");
  });

  it("should include testing section", () => {
    const output = generate({ format: "claude", projectInfo: baseProject });
    expect(output).toContain("Vitest");
  });

  it("should include package manager", () => {
    const output = generate({ format: "claude", projectInfo: baseProject });
    expect(output).toContain("pnpm");
  });

  it("should generate agents format with prohibited actions", () => {
    const output = generate({ format: "agents", projectInfo: baseProject });
    expect(output).toContain("Prohibited");
  });

  it("should generate cursor format with expert preamble", () => {
    const output = generate({ format: "cursor", projectInfo: baseProject });
    expect(output).toContain("expert");
  });

  it("should generate copilot format", () => {
    const output = generate({ format: "copilot", projectInfo: baseProject });
    expect(output).toContain("GitHub Copilot");
  });

  it("should include Python rules for Python projects", () => {
    const pythonProject: ProjectInfo = {
      ...baseProject,
      languages: ["Python"],
      primaryLanguage: "Python",
      framework: "FastAPI",
      packageManager: "Poetry",
    };
    const output = generate({ format: "claude", projectInfo: pythonProject });
    expect(output).toContain("Python");
    expect(output).toContain("type hints");
  });

  it("should include Go rules for Go projects", () => {
    const goProject: ProjectInfo = {
      ...baseProject,
      languages: ["Go"],
      primaryLanguage: "Go",
      framework: "Gin",
      packageManager: "Go modules",
    };
    const output = generate({ format: "claude", projectInfo: goProject });
    expect(output).toContain("Go");
    expect(output).toContain("error");
  });
});
