import { describe, expect, it } from "vitest";
import { formatFcfa } from "./format";

describe("formatFcfa", () => {
  it("affiche les montants avec séparateur et FCFA", () => {
    expect(formatFcfa(2000)).toMatch(/2\s000 FCFA/);
    expect(formatFcfa(500)).toBe("500 FCFA");
    expect(formatFcfa(0)).toBe("0 FCFA");
  });
});
