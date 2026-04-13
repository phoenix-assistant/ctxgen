export interface LintResult {
  score: number;
  checks: CheckResult[];
  suggestions: string[];
}

export interface CheckResult {
  name: string;
  passed: boolean;
  score: number;
  maxScore: number;
  message: string;
}

// Approximate token count (rough: 1 token ≈ 4 chars)
function countTokens(text: string): number {
  return Math.ceil(text.length / 4);
}

function checkCompleteness(content: string): CheckResult {
  const sections = [
    { key: /stack|language|framework/i, label: "stack/language info" },
    { key: /test|spec/i, label: "testing guidance" },
    { key: /install|setup|getting.started|quickstart/i, label: "setup instructions" },
    { key: /don.t|do not|avoid|prohibited|never/i, label: "prohibited actions" },
  ];

  const found = sections.filter((s) => s.key.test(content));
  const score = Math.round((found.length / sections.length) * 25);
  const missing = sections.filter((s) => !s.key.test(content)).map((s) => s.label);

  return {
    name: "Completeness",
    passed: found.length >= 3,
    score,
    maxScore: 25,
    message:
      missing.length > 0
        ? `Missing sections: ${missing.join(", ")}`
        : "All key sections present",
  };
}

function checkSpecificity(content: string): CheckResult {
  // Generic/vague phrases that reduce quality
  const vaguePatterns = [
    /write (good|clean|nice|proper) code/i,
    /follow best practices/i,
    /be (careful|cautious|thorough)/i,
    /make sure to/i,
    /always (try|remember|ensure)/i,
  ];

  // Specific patterns that add value
  const specificPatterns = [
    /`[^`]+`/, // code references
    /\b(use|prefer|avoid|never|always) [a-z]/i,
    /\d+/, // numbers/limits
    /--[a-z]/, // flags
  ];

  const vagueCount = vaguePatterns.filter((p) => p.test(content)).length;
  const specificCount = specificPatterns.filter((p) => p.test(content)).length;

  const ratio = specificCount / Math.max(specificCount + vagueCount, 1);
  const score = Math.round(ratio * 20);

  return {
    name: "Specificity",
    passed: vagueCount <= 1,
    score,
    maxScore: 20,
    message:
      vagueCount > 1
        ? `${String(vagueCount)} vague phrases found (e.g. "follow best practices"). Replace with specific rules.`
        : "Good specificity",
  };
}

function checkTokenEfficiency(content: string): CheckResult {
  const tokens = countTokens(content);
  const lines = content.split("\n").filter((l) => l.trim().length > 0);

  // Check for repetition
  const sentences = content
    .split(/[.\n]/)
    .map((s) => s.trim().toLowerCase())
    .filter((s) => s.length > 20);
  const unique = new Set(sentences);
  const repetitionRatio = unique.size / Math.max(sentences.length, 1);

  let score = 20;
  const messages: string[] = [];

  if (tokens > 3000) {
    score -= 10;
    messages.push(`File is ${String(tokens)} tokens — very long, may not fit in context windows`);
  } else if (tokens > 2000) {
    score -= 5;
    messages.push(`File is ${String(tokens)} tokens — consider trimming to stay under 2000`);
  }

  if (repetitionRatio < 0.8) {
    score -= 5;
    messages.push("Some repeated content detected — consolidate duplicate instructions");
  }

  if (lines.length > 100) {
    score -= 3;
    messages.push("Very long file — consider using sections with clear headers");
  }

  return {
    name: "Token Efficiency",
    passed: tokens <= 2000,
    score: Math.max(score, 0),
    maxScore: 20,
    message: messages.length > 0 ? messages.join("; ") : `${String(tokens)} tokens — within budget`,
  };
}

function checkContradictions(content: string): CheckResult {
  const contradictionPairs: Array<[RegExp, RegExp, string]> = [
    [/use tabs/i, /use spaces/i, "tab vs space indentation"],
    [/prefer classes/i, /prefer functions/i, "classes vs functions preference"],
    [/always use semicolons/i, /omit semicolons/i, "semicolon usage"],
    [/use default exports/i, /avoid default exports/i, "default export policy"],
  ];

  const found = contradictionPairs
    .filter(([a, b]) => a.test(content) && b.test(content))
    .map(([, , label]) => label);

  return {
    name: "No Contradictions",
    passed: found.length === 0,
    score: found.length === 0 ? 15 : Math.max(15 - found.length * 5, 0),
    maxScore: 15,
    message:
      found.length > 0
        ? `Contradictions found: ${found.join(", ")}`
        : "No contradictions detected",
  };
}

function checkActionability(content: string): CheckResult {
  // Actionable = imperative verbs + concrete nouns
  const actionablePatterns = [
    /\b(run|use|avoid|never|always|prefer|write|call|import|export|add|remove|create|update)\b/gi,
  ];

  const matches = actionablePatterns.flatMap((p) => [...content.matchAll(p)]);
  const linesWithActions = new Set(
    matches.map((m) => {
      const idx = m.index ?? 0;
      return content.substring(0, idx).split("\n").length;
    })
  );

  const totalLines = content.split("\n").filter((l) => l.trim().length > 5).length;
  const ratio = linesWithActions.size / Math.max(totalLines, 1);

  const score = Math.round(Math.min(ratio * 25, 20));

  return {
    name: "Actionability",
    passed: ratio > 0.3,
    score,
    maxScore: 20,
    message:
      ratio < 0.3
        ? "Many lines lack actionable instructions — use imperative verbs (use, avoid, prefer, run)"
        : "Good use of actionable language",
  };
}

export function lintFile(content: string): LintResult {
  const checks: CheckResult[] = [
    checkCompleteness(content),
    checkSpecificity(content),
    checkTokenEfficiency(content),
    checkContradictions(content),
    checkActionability(content),
  ];

  const score = checks.reduce((sum, c) => sum + c.score, 0);

  const suggestions: string[] = [];

  for (const check of checks) {
    if (!check.passed) {
      suggestions.push(`[${check.name}] ${check.message}`);
    }
  }

  if (score >= 90) {
    suggestions.push("🏆 Excellent context file!");
  } else if (score >= 70) {
    suggestions.push("✅ Good context file with minor improvements possible.");
  } else if (score >= 50) {
    suggestions.push("⚠️  Adequate but needs improvement for best AI results.");
  } else {
    suggestions.push("❌ Context file needs significant work.");
  }

  return { score, checks, suggestions };
}
