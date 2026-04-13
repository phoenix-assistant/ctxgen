import { describe, it, expect } from "vitest";
import { lintFile } from "../src/linter/index.js";

describe("linter", () => {
  it("should return score 0-100", () => {
    const result = lintFile("# My Project\nUse TypeScript strict mode.\nRun tests with vitest.");
    expect(result.score).toBeGreaterThanOrEqual(0);
    expect(result.score).toBeLessThanOrEqual(100);
  });

  it("should detect missing sections", () => {
    const result = lintFile("# My Project\nSome content here.");
    const completeness = result.checks.find((c) => c.name === "Completeness");
    expect(completeness).toBeDefined();
    expect(completeness?.passed).toBe(false);
  });

  it("should detect vague language", () => {
    const result = lintFile(
      "# Project\nAlways follow best practices. Write good code. Be careful."
    );
    const specificity = result.checks.find((c) => c.name === "Specificity");
    expect(specificity?.passed).toBe(false);
  });

  it("should warn on large files", () => {
    const bigContent = "Use TypeScript strict mode.\n".repeat(400);
    const result = lintFile(bigContent);
    const tokenCheck = result.checks.find((c) => c.name === "Token Efficiency");
    expect(tokenCheck?.passed).toBe(false);
  });

  it("should detect contradictions", () => {
    const result = lintFile(
      "# Project\nUse tabs for indentation.\nUse spaces for indentation.\n"
    );
    const contradictions = result.checks.find((c) => c.name === "No Contradictions");
    expect(contradictions?.passed).toBe(false);
  });

  it("should give good scores for quality content", () => {
    const quality = `# MyProject
Stack: TypeScript · pnpm

## Core Principles
- DRY, KISS, SOLID
- Use strict TypeScript (\`strict: true\`)
- Avoid \`any\` type
- Never ignore errors

## Testing
- Use Vitest for tests
- Run: \`pnpm test\`

## Tooling
- Package manager: pnpm
- Build: tsup
- Linter: ESLint

## Setup
Run \`pnpm install\` to install dependencies.

## What NOT To Do
- Do not use \`any\`
- Do not skip error handling
- Do not commit secrets
`;
    const result = lintFile(quality);
    expect(result.score).toBeGreaterThan(50);
  });

  it("should provide suggestions for poor files", () => {
    const result = lintFile("hello world");
    expect(result.suggestions.length).toBeGreaterThan(0);
  });
});
