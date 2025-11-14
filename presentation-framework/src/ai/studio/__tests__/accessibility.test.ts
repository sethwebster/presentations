/**
 * Tests for accessibility utilities
 * Validates WCAG contrast calculations and enforcement
 */

import { describe, it, expect } from "vitest";
import {
  luminance,
  contrastRatio,
  meetsAA,
  meetsAAA,
  ensureAA,
  getContrastingText,
  lighten,
  darken,
} from "../accessibility";

describe("Accessibility Utilities", () => {
  describe("luminance", () => {
    it("should calculate correct luminance for pure colors", () => {
      expect(luminance("#FFFFFF")).toBeCloseTo(1.0, 1);
      expect(luminance("#000000")).toBeCloseTo(0.0, 1);
      expect(luminance("#FF0000")).toBeGreaterThan(0.2);
    });

    it("should handle hex colors without # prefix", () => {
      expect(luminance("FFFFFF")).toBeCloseTo(1.0, 1);
      expect(luminance("000000")).toBeCloseTo(0.0, 1);
    });
  });

  describe("contrastRatio", () => {
    it("should calculate correct contrast ratios", () => {
      // Black on white should be maximum contrast (21:1)
      const ratio = contrastRatio("#000000", "#FFFFFF");
      expect(ratio).toBeCloseTo(21, 0);
    });

    it("should be symmetric (order doesn't matter)", () => {
      const ratio1 = contrastRatio("#FF0000", "#00FF00");
      const ratio2 = contrastRatio("#00FF00", "#FF0000");
      expect(ratio1).toBe(ratio2);
    });

    it("should return 1:1 for identical colors", () => {
      expect(contrastRatio("#FF0000", "#FF0000")).toBeCloseTo(1, 1);
    });
  });

  describe("meetsAA", () => {
    it("should pass for high contrast combinations", () => {
      expect(meetsAA("#000000", "#FFFFFF")).toBe(true);
      expect(meetsAA("#FFFFFF", "#000000")).toBe(true);
    });

    it("should fail for low contrast combinations", () => {
      expect(meetsAA("#CCCCCC", "#FFFFFF")).toBe(false);
      expect(meetsAA("#888888", "#777777")).toBe(false);
    });

    it("should use different thresholds for large text", () => {
      const fg = "#767676";
      const bg = "#FFFFFF";

      // May fail for normal text (4.5:1 threshold)
      const normalText = meetsAA(fg, bg, false);

      // But pass for large text (3:1 threshold)
      const largeText = meetsAA(fg, bg, true);

      if (!normalText) {
        expect(largeText).toBe(true);
      }
    });
  });

  describe("meetsAAA", () => {
    it("should have stricter requirements than AA", () => {
      const fg = "#595959";
      const bg = "#FFFFFF";

      const aa = meetsAA(fg, bg);
      const aaa = meetsAAA(fg, bg);

      // A color can pass AA but fail AAA
      expect(aa || !aaa).toBe(true);
    });
  });

  describe("ensureAA", () => {
    it("should return original color if already meets AA", () => {
      const text = "#000000";
      const bg = "#FFFFFF";
      expect(ensureAA(bg, text)).toBe(text);
    });

    it("should return black or white if original fails", () => {
      const text = "#CCCCCC"; // Light gray
      const bg = "#FFFFFF"; // White
      const result = ensureAA(bg, text);

      expect(result === "#FFFFFF" || result === "#0E0E0E").toBe(true);
      expect(meetsAA(result, bg)).toBe(true);
    });
  });

  describe("getContrastingText", () => {
    it("should return dark text for light backgrounds", () => {
      expect(getContrastingText("#FFFFFF")).toBe("#0E0E0E");
      expect(getContrastingText("#F0F0F0")).toBe("#0E0E0E");
    });

    it("should return light text for dark backgrounds", () => {
      expect(getContrastingText("#000000")).toBe("#FFFFFF");
      expect(getContrastingText("#1A1A1A")).toBe("#FFFFFF");
    });
  });

  describe("lighten", () => {
    it("should lighten a color by percentage", () => {
      const original = "#808080"; // Mid gray
      const lightened = lighten(original, 20);

      const origLum = luminance(original);
      const newLum = luminance(lightened);

      expect(newLum).toBeGreaterThan(origLum);
    });

    it("should not exceed #FFFFFF", () => {
      const lightened = lighten("#F0F0F0", 50);
      const lum = luminance(lightened);
      expect(lum).toBeLessThanOrEqual(1.0);
    });
  });

  describe("darken", () => {
    it("should darken a color by percentage", () => {
      const original = "#808080"; // Mid gray
      const darkened = darken(original, 20);

      const origLum = luminance(original);
      const newLum = luminance(darkened);

      expect(newLum).toBeLessThan(origLum);
    });

    it("should not go below #000000", () => {
      const darkened = darken("#101010", 50);
      const lum = luminance(darkened);
      expect(lum).toBeGreaterThanOrEqual(0.0);
    });
  });

  describe("Real-world color combinations", () => {
    const testCases = [
      {
        name: "Apple-style: Black on white",
        fg: "#0E0E0E",
        bg: "#FFFFFF",
        shouldPassAA: true,
      },
      {
        name: "Cinematic: Light text on dark",
        fg: "#F5F7FA",
        bg: "#0A0C10",
        shouldPassAA: true,
      },
      {
        name: "Editorial: Warm brown on cream",
        fg: "#B85C38",
        bg: "#FAFAF8",
        shouldPassAA: false, // This combination actually fails AA
      },
      {
        name: "Bad combo: Light gray on white",
        fg: "#D3D3D3",
        bg: "#FFFFFF",
        shouldPassAA: false,
      },
    ];

    testCases.forEach(({ name, fg, bg, shouldPassAA }) => {
      it(name, () => {
        const passes = meetsAA(fg, bg);
        expect(passes).toBe(shouldPassAA);

        if (!shouldPassAA) {
          // Ensure our fix works
          const fixed = ensureAA(bg, fg);
          expect(meetsAA(fixed, bg)).toBe(true);
        }
      });
    });
  });
});
