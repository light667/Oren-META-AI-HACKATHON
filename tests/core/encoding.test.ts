import { describe, expect, it } from "vitest";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { formatFcfa } from "@/lib/format";
import { fr } from "@/i18n/fr";

const MOJIBAKE_REGEX = /Â|â€|Ã©|Ã |Ã¨|Ãª|Ã§|Ã®|Ã´|Ã¹/;

function collectFiles(dir: string, exts: string[]): string[] {
  const results: string[] = [];
  const entries = readdirSync(dir);
  for (const entry of entries) {
    if (entry === "node_modules" || entry === ".next" || entry === ".git") continue;
    const full = join(dir, entry);
    const stat = statSync(full);
    if (stat.isDirectory()) {
      results.push(...collectFiles(full, exts));
    } else if (exts.some((ext) => entry.endsWith(ext))) {
      results.push(full);
    }
  }
  return results;
}

describe("Encodage UTF-8 (Tâche D5)", () => {
  it("aucun fichier source ne contient de mojibake (Â ou â€ ou Ã)", () => {
    const root = process.cwd();
    const srcFiles = collectFiles(join(root, "src"), [".ts", ".tsx", ".css"]);
    const testFiles = collectFiles(join(root, "tests"), [".ts", ".tsx"]).filter(
      (f) => !f.endsWith("encoding.test.ts"),
    );
    const allFiles = [...srcFiles, ...testFiles];

    const violations: { file: string; line: number; text: string }[] = [];

    for (const file of allFiles) {
      const content = readFileSync(file, "utf8");
      const lines = content.split("\n");
      lines.forEach((line, index) => {
        if (MOJIBAKE_REGEX.test(line)) {
          violations.push({
            file: file.replace(root, ""),
            line: index + 1,
            text: line.trim(),
          });
        }
      });
    }

    expect(
      violations,
      `Caractères d'encodage corrompus trouvés :\n${violations
        .map((v) => `${v.file}:${v.line} -> ${v.text}`)
        .join("\n")}`,
    ).toEqual([]);
  });

  it("formatFcfa ne contient jamais Â ou â€", () => {
    const formatted = formatFcfa(2000);
    expect(formatted).toMatch(/2.*000.*FCFA/);
    expect(formatted).not.toContain("\u00C2");
    expect(formatted).not.toContain("\u00E2\u20AC");
  });

  it("les textes de fr.ts ne contiennent jamais Â ou â€", () => {
    const jsonStr = JSON.stringify(fr);
    expect(jsonStr).not.toContain("\u00C2");
    expect(jsonStr).not.toContain("\u00E2\u20AC");
  });
});
