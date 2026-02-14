import { describe, it, expect } from "vitest";
import { transpose } from "./transpose.js";
import { parse } from "./parser.js";
import { chordproToHtml } from "./index.js";

/** Helper: parse a single chord line and transpose, return the chord strings */
function transposeLine(input: string, semitones: number, options = {}): string[] {
  const song = parse(input);
  const transposed = transpose(song, semitones, options);
  const line = transposed.nodes[0];
  if (line.type !== "line") throw new Error("Expected a line node");
  return line.chords.map((c) => c.chord).filter(Boolean);
}

describe("transpose", () => {
  describe("standard notation", () => {
    it("transposes C up by 2 to D", () => {
      expect(transposeLine("[C]Hello", 2)).toEqual(["D"]);
    });

    it("transposes Am up by 3 to Cm", () => {
      expect(transposeLine("[Am]Hello", 3)).toEqual(["Cm"]);
    });

    it("transposes F#m7 up by 1 to Gm7", () => {
      expect(transposeLine("[F#m7]Hello", 1)).toEqual(["Gm7"]);
    });

    it("transposes G up by 5 to C", () => {
      expect(transposeLine("[G]Hello", 5)).toEqual(["C"]);
    });

    it("transposes multiple chords on a line", () => {
      expect(transposeLine("[C]Hello [Am]world", 2)).toEqual(["D", "Bm"]);
    });

    it("transposes down (negative semitones)", () => {
      expect(transposeLine("[D]Hello", -2)).toEqual(["C"]);
    });
  });

  describe("accidental preference", () => {
    it("uses flat when preference is flat", () => {
      expect(transposeLine("[C]Hello", 1, { accidentalPreference: "flat" })).toEqual(["Db"]);
    });

    it("uses sharp when preference is sharp", () => {
      expect(transposeLine("[C]Hello", 1, { accidentalPreference: "sharp" })).toEqual(["C#"]);
    });

    it("produces Eb when transposing E down by 1 with flat preference", () => {
      expect(transposeLine("[E]Hello", -1, { accidentalPreference: "flat" })).toEqual(["Eb"]);
    });

    it("produces D# when transposing E down by 1 with sharp preference", () => {
      expect(transposeLine("[E]Hello", -1, { accidentalPreference: "sharp" })).toEqual(["D#"]);
    });

    it("auto-detects flat preference from existing chords", () => {
      expect(transposeLine("[Bb]Hello [Eb]world", 2)).toEqual(["C", "F"]);
    });
  });

  describe("German notation", () => {
    it("transposes H up by 1 to C (auto-detected)", () => {
      expect(transposeLine("[H]Hello", 1)).toEqual(["C"]);
    });

    it("transposes B up by 1 to H in German notation", () => {
      expect(transposeLine("[B]Hello [H]anchor", 1)).toEqual(["H", "C"]);
    });

    it("transposes Am up by 1 to Bm in German notation", () => {
      // H present triggers German; A+1 = Bb = B in German
      expect(transposeLine("[Am]Hello [H]anchor", 1, { notation: "german" })).toEqual(["Bm", "C"]);
    });

    it("uses German flat names", () => {
      expect(transposeLine("[C]Hello", 1, { notation: "german", accidentalPreference: "flat" })).toEqual(["Db"]);
    });

    it("uses German sharp names", () => {
      expect(transposeLine("[C]Hello", 1, { notation: "german", accidentalPreference: "sharp" })).toEqual(["C#"]);
    });
  });

  describe("slash chords", () => {
    it("transposes both parts of a slash chord", () => {
      expect(transposeLine("[Am/E]Hello", 2)).toEqual(["Bm/F#"]);
    });

    it("transposes C/G up by 5", () => {
      expect(transposeLine("[C/G]Hello", 5)).toEqual(["F/C"]);
    });
  });

  describe("full octave", () => {
    it("transposes by 12 returns the same chord", () => {
      expect(transposeLine("[D]Hello", 12)).toEqual(["D"]);
    });

    it("transposes by -12 returns the same chord", () => {
      expect(transposeLine("[F#m7]Hello", -12)).toEqual(["F#m7"]);
    });
  });

  describe("edge cases", () => {
    it("passes through empty chord strings", () => {
      const song = parse("Hello world");
      const transposed = transpose(song, 3);
      const line = transposed.nodes[0];
      if (line.type !== "line") throw new Error("Expected a line node");
      expect(line.chords).toEqual([{ chord: "", lyric: "Hello world" }]);
    });

    it("passes through non-chord strings like N.C.", () => {
      expect(transposeLine("[N.C.]Hello", 3)).toEqual(["N.C."]);
    });

    it("returns the same song when semitones is 0", () => {
      const song = parse("[Am]Hello");
      const transposed = transpose(song, 0);
      expect(transposed).toBe(song); // same reference
    });

    it("handles a song with no chords", () => {
      const song = parse("{title: No Chords}\nJust lyrics");
      const transposed = transpose(song, 5);
      expect(transposed.nodes).toHaveLength(2);
    });

    it("transposes chords inside sections", () => {
      const song = parse("{soc}\n[Am]Hello [G]world\n{eoc}");
      const transposed = transpose(song, 2);
      const section = transposed.nodes[0];
      if (section.type !== "section") throw new Error("Expected section");
      const line = section.lines[0];
      if (line.type !== "line") throw new Error("Expected line");
      expect(line.chords.map((c) => c.chord)).toEqual(["Bm", "A"]);
    });

    it("preserves lyrics when transposing", () => {
      const song = parse("[Am]Hello [G]world");
      const transposed = transpose(song, 2);
      const line = transposed.nodes[0];
      if (line.type !== "line") throw new Error("Expected line");
      expect(line.chords.map((c) => c.lyric)).toEqual(["Hello ", "world"]);
    });

    it("transposes {key:} directive", () => {
      const song = parse("{key: G}\n[G]Hello");
      const transposed = transpose(song, 2);
      const directive = transposed.nodes[0];
      if (directive.type !== "directive") throw new Error("Expected directive");
      expect(directive.value).toBe("A");
    });

    it("transposes {key:} with sharp", () => {
      const song = parse("{key: F#m}\n[F#m]Hello");
      const transposed = transpose(song, 1);
      const directive = transposed.nodes[0];
      if (directive.type !== "directive") throw new Error("Expected directive");
      expect(directive.value).toBe("Gm");
    });

    it("does not modify other directives", () => {
      const song = parse("{title: G Major Song}\n[G]Hello");
      const transposed = transpose(song, 2);
      const directive = transposed.nodes[0];
      if (directive.type !== "directive") throw new Error("Expected directive");
      expect(directive.value).toBe("G Major Song");
    });

    it("preserves section labels when transposing", () => {
      const song = parse("{start_of_chorus: Chorus 2}\n[Am]Hey\n{end_of_chorus}");
      const transposed = transpose(song, 1);
      const section = transposed.nodes[0];
      if (section.type !== "section") throw new Error("Expected section");
      expect(section.label).toBe("Chorus 2");
    });
  });

  describe("integration with chordproToHtml", () => {
    it("transposes chords in the HTML output", () => {
      const input = "[C]Hello [Am]world";
      const html = chordproToHtml(input, { transpose: 2 });
      expect(html).toContain("D");
      expect(html).toContain("Bm");
      expect(html).not.toContain(">C<");
      expect(html).not.toContain(">Am<");
    });

    it("produces identical output with transpose 0", () => {
      const input = "[G]Hello";
      const without = chordproToHtml(input);
      const withZero = chordproToHtml(input, { transpose: 0 });
      expect(without).toBe(withZero);
    });
  });
});
