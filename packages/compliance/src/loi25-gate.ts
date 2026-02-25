import { glob } from "glob";
import { readFileSync } from "fs";

/**
 * CI gate — scans TypeScript/Prisma files for Loi 25 violations.
 * Run via: pnpm --filter=@lms/compliance run check:loi25
 */

interface ComplianceViolation {
  file: string;
  line: number;
  rule: string;
  message: string;
  severity: "error" | "warning";
}

const RULES = [
  {
    id: "LOI25-001",
    severity: "error" as const,
    description: "PII field without retention policy annotation",
    check: (content: string, _file: string): string[] => {
      const piiFields = ["email", "phone", "address", "birthdate", "sin", "nip", "passport"];
      const violations: string[] = [];
      const lines = content.split("\n");
      lines.forEach((line, i) => {
        const lowerLine = line.toLowerCase();
        if (piiFields.some((f) => lowerLine.includes(f))) {
          const prevLines = lines.slice(Math.max(0, i - 5), i).join("\n");
          if (!prevLines.includes("@RetentionPolicy") && !prevLines.includes("retention_days")) {
            violations.push(`Line ${i + 1}: PII field "${line.trim()}" missing @RetentionPolicy`);
          }
        }
      });
      return violations;
    },
  },
  {
    id: "LOI25-002",
    severity: "error" as const,
    description: "AWS region not set to ca-central-1",
    check: (content: string, _file: string): string[] => {
      const nonCanadianRegions = /us-east|eu-west|ap-southeast|us-west/g;
      const matches = content.match(nonCanadianRegions);
      return matches ? [`Non-Canadian region detected: ${matches.join(", ")}`] : [];
    },
  },
  {
    id: "LOI25-003",
    severity: "warning" as const,
    description: "Direct PII storage without consent_id reference",
    check: (content: string, _file: string): string[] => {
      if (content.includes("@Column") && content.includes("email")) {
        if (!content.includes("consentId") && !content.includes("consent_id")) {
          return ["Entity with email field missing consent_id foreign key"];
        }
      }
      return [];
    },
  },
  {
    id: "LOI25-004",
    severity: "error" as const,
    description: "Biometric data collection without ÉFVP annotation",
    check: (content: string, _file: string): string[] => {
      const biometricKeywords = ["biometric", "facial_recognition", "fingerprint", "proctor", "proctoring"];
      if (biometricKeywords.some((k) => content.toLowerCase().includes(k))) {
        if (!content.includes("@RequiresEFVP") && !content.includes("privacy_impact_assessment")) {
          return ["Biometric data detected — ÉFVP (Privacy Impact Assessment) annotation required"];
        }
      }
      return [];
    },
  },
];

export async function runLoi25Gate(rootDir = "."): Promise<void> {
  const files = await glob(`${rootDir}/**/*.{ts,prisma}`, {
    ignore: ["**/node_modules/**", "**/dist/**", "**/*.test.ts", "**/*.spec.ts"],
  });

  const allViolations: ComplianceViolation[] = [];

  for (const file of files) {
    const content = readFileSync(file, "utf-8");
    for (const rule of RULES) {
      const hits = rule.check(content, file);
      for (const hit of hits) {
        allViolations.push({
          file,
          line: 0,
          rule: rule.id,
          message: hit,
          severity: rule.severity,
        });
      }
    }
  }

  const errors = allViolations.filter((v) => v.severity === "error");
  const warnings = allViolations.filter((v) => v.severity === "warning");

  if (warnings.length > 0) {
    console.warn("\n⚠️  Loi 25 Warnings:");
    warnings.forEach((v) => console.warn(`  [${v.rule}] ${v.file}: ${v.message}`));
  }

  if (errors.length > 0) {
    console.error("\n❌ Loi 25 Compliance ERRORS (blocking):");
    errors.forEach((v) => console.error(`  [${v.rule}] ${v.file}: ${v.message}`));
    console.error(`\n${errors.length} error(s) must be resolved before merge.\n`);
    process.exit(1);
  }

  console.log(`✅ Loi 25 compliance gate passed (${files.length} files scanned, ${warnings.length} warnings)`);
}

// Run if called directly
if (process.argv[1]?.endsWith("loi25-check.js")) {
  runLoi25Gate(process.cwd()).catch(console.error);
}
