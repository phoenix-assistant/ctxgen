import { describe, it, expect } from "vitest";
import { analyzeProject } from "../src/analyzer/index.js";
import { join } from "path";
import { fileURLToPath } from "url";

const __dirname = fileURLToPath(new URL(".", import.meta.url));
const projectRoot = join(__dirname, "..");

describe("analyzer", () => {
  it("should detect TypeScript from tsconfig.json", async () => {
    const info = await analyzeProject(projectRoot);
    expect(info.languages).toContain("TypeScript");
    expect(info.primaryLanguage).toBe("TypeScript");
  });

  it("should detect package manager from lockfile", async () => {
    const info = await analyzeProject(projectRoot);
    expect(info.packageManager).toBeTruthy();
  });

  it("should detect test framework", async () => {
    const info = await analyzeProject(projectRoot);
    expect(info.testFramework).toBe("Vitest");
  });

  it("should detect linter", async () => {
    const info = await analyzeProject(projectRoot);
    expect(info.linter).toContain("ESLint");
  });

  it("should detect src directory", async () => {
    const info = await analyzeProject(projectRoot);
    expect(info.hasSrc).toBe(true);
  });

  it("should detect tests directory", async () => {
    const info = await analyzeProject(projectRoot);
    expect(info.hasTests).toBe(true);
  });

  it("should return unknown for empty directory", async () => {
    const info = await analyzeProject("/tmp");
    expect(info.primaryLanguage).toBe("unknown");
  });
});
