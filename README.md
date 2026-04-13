# Context File Generator + Linter (ctxgen)
> Generate and lint CLAUDE.md / AGENTS.md / Cursor rules from your codebase — so AI coding assistants actually understand your project.

## Problem

**Who:** Developers using AI coding assistants (Claude Code, Cursor, Copilot, Codex)
**Pain:** Context files are the #1 driver of AI code quality, but most developers either skip them or write bad ones. Result: AI makes wrong assumptions, overcomplicates code, violates project conventions.
**Current solutions:** Manual markdown files, copy-paste from blog posts, forrestchang's static template (15K stars proves demand). No tool analyzes your actual codebase to generate context.

## Solution

**What:** CLI tool that scans your codebase and generates optimized context files + lints existing ones for completeness and quality.
**How:** AST analysis + heuristics to detect stack, conventions, patterns, then generates structured context files. Linter scores existing files against best practices.
**Why us:** We run AI agents 24/7 — we know what context actually improves output vs. what's noise.

## Why Now

- CLAUDE.md repo hit 15K stars — massive demand signal
- Context engineering recognized as core skill (Karpathy, Tobi Lütke)
- Every AI coding tool now supports context files but no tool helps create good ones
- forrestchang proved demand; we build the tooling layer

## Technical Architecture

```
ctxgen/
├── src/
│   ├── analyzer/       # Codebase analysis (AST, file patterns, deps)
│   ├── generators/     # CLAUDE.md, AGENTS.md, .cursorrules, copilot-instructions
│   ├── linter/         # Score + improve existing context files
│   ├── templates/      # Best-practice templates by stack
│   └── cli.ts          # CLI entry point
├── templates/           # Stack-specific templates (React, Python, Go, etc.)
└── tests/
```

### Stack
| Component | Technology | Why |
|-----------|------------|-----|
| Runtime | Node.js/TypeScript | Widest dev adoption, fast CLI |
| Parser | tree-sitter | Multi-language AST analysis |
| CLI | Commander.js | Standard CLI framework |
| Templates | Handlebars | Flexible template engine |
| Distribution | npm + binary (pkg) | Maximum reach |

### Key Features
1. **`ctxgen init`** — Scan codebase, generate context file for your AI tool
2. **`ctxgen lint`** — Score existing context files (0-100), suggest improvements
3. **`ctxgen update`** — Re-scan and update context file after codebase changes
4. **Multi-format:** CLAUDE.md, AGENTS.md, .cursorrules, .github/copilot-instructions.md
5. **Stack-aware:** Different templates for React, Python, Go, Rust, etc.
6. **Rule encoding:** Auto-encodes DRY/KISS/YAGNI/SOLID/TDD as behavioral rules
7. **Token budget:** Warns when context file exceeds token limits for target model

## Verdict

🟢 BUILD

**Reasoning:** 15K stars on a static template proves massive demand. No tool does this dynamically. Developer productivity is a huge market and context engineering is becoming a core discipline. First-mover advantage is real — this will get copied quickly.

**First customer:** Any developer using Claude Code, Cursor, or Copilot who wants better AI output.
