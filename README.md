# ctxgen

> Generate and lint CLAUDE.md / AGENTS.md / .cursorrules / copilot-instructions.md from your codebase — so AI coding assistants actually understand your project.

[![npm version](https://img.shields.io/npm/v/@phoenixaihub/ctxgen)](https://www.npmjs.com/package/@phoenixaihub/ctxgen)
[![CI](https://github.com/phoenix-assistant/ctxgen/actions/workflows/ci.yml/badge.svg)](https://github.com/phoenix-assistant/ctxgen/actions)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

---

## Why ctxgen?

Context files are the **#1 driver of AI code quality**, but most developers either skip them or write bad ones. Without proper context, AI assistants make wrong assumptions, violate project conventions, and complicate code unnecessarily.

`ctxgen` scans your codebase and generates optimized context files with the right rules, then scores existing ones for quality.

---

## Installation

```bash
npm install -g @phoenixaihub/ctxgen
# or
npx @phoenixaihub/ctxgen init
```

---

## Commands

### `ctxgen init`

Scan the current directory, detect stack/framework/conventions, and generate a context file.

```bash
# Generate CLAUDE.md (default)
ctxgen init

# Generate for other tools
ctxgen init --format agents    # → AGENTS.md
ctxgen init --format cursor    # → .cursorrules
ctxgen init --format copilot   # → .github/copilot-instructions.md

# Preview without writing
ctxgen init --dry-run

# Scan a specific directory
ctxgen init --cwd /path/to/project
```

**Auto-detects:**
- Language: TypeScript, JavaScript, Python, Go, Rust
- Framework: Next.js, React, FastAPI, Django, Gin, Axum, Express, and more
- Package manager: npm, pnpm, yarn, bun, Poetry, Cargo, Go modules
- Test framework: Vitest, Jest, pytest, cargo test
- Linter: ESLint, Biome, Ruff, Flake8
- CI: GitHub Actions, CircleCI, Travis CI

**Sample output (`CLAUDE.md`):**

```markdown
# my-app

A TypeScript CLI tool.

**Stack**: TypeScript (React) · pnpm

## Core Principles

Follow these principles in all code you write:
- **DRY** (Don't Repeat Yourself): Extract reusable logic into functions/modules
- **KISS** (Keep It Simple, Stupid): Prefer simple, readable solutions over clever ones
- **YAGNI** (You Aren't Gonna Need It): Don't add features until they're needed
- **SOLID**: Follow Single Responsibility, Open/Closed, Liskov Substitution...
- **TDD**: Write tests before or alongside implementation

## TypeScript Rules

- Use strict TypeScript (`strict: true` in tsconfig)
- No `any` — use `unknown` and narrow with guards
- Prefer `interface` over `type` for object shapes
...
```

---

### `ctxgen lint [file]`

Score an existing context file from 0–100 with detailed feedback.

```bash
# Auto-detect context file
ctxgen lint

# Lint a specific file
ctxgen lint CLAUDE.md
ctxgen lint .cursorrules
```

**Sample output:**

```
📊 Linting: CLAUDE.md

  ✓ Completeness          25/25  All key sections present
  ✗ Specificity            8/20  3 vague phrases found (e.g. "follow best practices")
  ✓ Token Efficiency      20/20  1847 tokens — within budget
  ✓ No Contradictions     15/15  No contradictions detected
  ✓ Actionability         18/20  Good use of actionable language

  Score:                  86/100

💡 Suggestions:

  [Specificity] Replace vague phrases with specific rules like "use `pnpm` not npm"
```

---

### `ctxgen update`

Re-scan and update existing context file. Preserves your custom `## Notes` section.

```bash
ctxgen update
```

---

### `ctxgen diff`

Dry run of update — shows what would change without writing.

```bash
ctxgen diff
```

---

## Scoring Rubric

| Check | Max Score | What it tests |
|-------|-----------|---------------|
| Completeness | 25 | Has stack info, testing guidance, setup, prohibited actions |
| Specificity | 20 | Concrete rules vs. vague platitudes |
| Token Efficiency | 20 | Under 2000 tokens, no repetition |
| No Contradictions | 15 | No conflicting rules |
| Actionability | 20 | Imperative language (use/avoid/prefer/run) |

---

## Supported Stacks

| Language | Frameworks | Package Managers |
|----------|------------|-----------------|
| TypeScript/JS | React, Next.js, Vue, Svelte, Express, Fastify, NestJS, Hono | npm, pnpm, yarn, bun |
| Python | FastAPI, Django, Flask | pip, Poetry, PDM, Hatch |
| Go | Gin, Echo, Fiber | Go modules |
| Rust | Actix Web, Axum, Rocket | Cargo |

---

## Programmatic API

```typescript
import { analyzeProject, generate, lintFile } from "@phoenixaihub/ctxgen";

// Analyze project
const info = await analyzeProject("/path/to/project");

// Generate context file
const content = generate({ format: "claude", projectInfo: info });

// Lint a file
const result = lintFile(content);
console.log(`Score: ${result.score}/100`);
```

---

## Token Budget

ctxgen warns when output exceeds **2000 tokens** — a safe budget for most context windows. Trim the generated file to keep the most actionable rules.

---

## Contributing

Pull requests welcome! See [CONTRIBUTING guidelines](.github/pull_request_template.md).

```bash
git clone https://github.com/phoenix-assistant/ctxgen
cd ctxgen
npm install
npm test
npm run build
```

---

## License

MIT © [Phoenix AI Hub](https://github.com/phoenix-assistant)
