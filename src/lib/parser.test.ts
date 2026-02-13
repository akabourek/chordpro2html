import { describe, it, expect } from "vitest";
import { parse } from "./parser.js";

describe("parse", () => {
  it("returns an empty song for empty input", () => {
    expect(parse("")).toEqual({ nodes: [] });
  });

  it("returns an empty song for whitespace-only input", () => {
    expect(parse("   \n  \n  ")).toEqual({ nodes: [] });
  });

  describe("directives", () => {
    it("parses a title directive", () => {
      const song = parse("{title: My Song}");
      expect(song.nodes).toEqual([
        { type: "directive", name: "title", value: "My Song" },
      ]);
    });

    it("parses a directive with no value", () => {
      const song = parse("{new_page}");
      expect(song.nodes).toEqual([
        { type: "directive", name: "new_page", value: "" },
      ]);
    });

    it("normalizes directive names to lowercase", () => {
      const song = parse("{Title: Foo}");
      expect(song.nodes[0]).toEqual({
        type: "directive",
        name: "title",
        value: "Foo",
      });
    });

    it("expands short directive aliases", () => {
      const song = parse("{t: My Song}");
      expect(song.nodes[0]).toEqual({
        type: "directive",
        name: "title",
        value: "My Song",
      });
    });

    it("expands subtitle alias", () => {
      const song = parse("{st: The Artist}");
      expect(song.nodes[0]).toEqual({
        type: "directive",
        name: "subtitle",
        value: "The Artist",
      });
    });

    it("expands comment alias", () => {
      const song = parse("{c: Capo 2}");
      expect(song.nodes[0]).toEqual({
        type: "directive",
        name: "comment",
        value: "Capo 2",
      });
    });

    it("preserves colons in directive values", () => {
      const song = parse("{comment: Note: play softly}");
      expect(song.nodes[0]).toEqual({
        type: "directive",
        name: "comment",
        value: "Note: play softly",
      });
    });

    it("parses multiple directives", () => {
      const song = parse("{title: My Song}\n{artist: Someone}");
      expect(song.nodes).toHaveLength(2);
      expect(song.nodes[0]).toEqual({
        type: "directive",
        name: "title",
        value: "My Song",
      });
      expect(song.nodes[1]).toEqual({
        type: "directive",
        name: "artist",
        value: "Someone",
      });
    });
  });

  describe("lyric lines", () => {
    it("parses a plain lyric line with no chords", () => {
      const song = parse("Hello world");
      expect(song.nodes).toEqual([
        { type: "line", chords: [{ chord: "", lyric: "Hello world" }] },
      ]);
    });

    it("parses a line with a single chord", () => {
      const song = parse("[Am]Hello");
      expect(song.nodes).toEqual([
        { type: "line", chords: [{ chord: "Am", lyric: "Hello" }] },
      ]);
    });

    it("parses a line with multiple chords", () => {
      const song = parse("[Am]Hello [G]world");
      expect(song.nodes).toEqual([
        {
          type: "line",
          chords: [
            { chord: "Am", lyric: "Hello " },
            { chord: "G", lyric: "world" },
          ],
        },
      ]);
    });

    it("parses text before the first chord", () => {
      const song = parse("Well [Am]hello");
      expect(song.nodes).toEqual([
        {
          type: "line",
          chords: [
            { chord: "", lyric: "Well " },
            { chord: "Am", lyric: "hello" },
          ],
        },
      ]);
    });

    it("handles consecutive chords with no lyrics between", () => {
      const song = parse("[Am][G]Hello");
      expect(song.nodes).toEqual([
        {
          type: "line",
          chords: [
            { chord: "Am", lyric: "" },
            { chord: "G", lyric: "Hello" },
          ],
        },
      ]);
    });

    it("handles a chord at the end of a line with no trailing text", () => {
      const song = parse("Hello [Am]");
      expect(song.nodes).toEqual([
        {
          type: "line",
          chords: [
            { chord: "", lyric: "Hello " },
            { chord: "Am", lyric: "" },
          ],
        },
      ]);
    });

    it("handles a line of only chords", () => {
      const song = parse("[Am] [G] [C]");
      expect(song.nodes).toEqual([
        {
          type: "line",
          chords: [
            { chord: "Am", lyric: " " },
            { chord: "G", lyric: " " },
            { chord: "C", lyric: "" },
          ],
        },
      ]);
    });

    it("parses complex chord names", () => {
      const song = parse("[F#m7b5]Hello [Bbmaj7]world");
      expect(song.nodes[0]).toEqual({
        type: "line",
        chords: [
          { chord: "F#m7b5", lyric: "Hello " },
          { chord: "Bbmaj7", lyric: "world" },
        ],
      });
    });
  });

  describe("empty lines", () => {
    it("parses empty lines between content", () => {
      const song = parse("Hello\n\nWorld");
      expect(song.nodes).toEqual([
        { type: "line", chords: [{ chord: "", lyric: "Hello" }] },
        { type: "empty" },
        { type: "line", chords: [{ chord: "", lyric: "World" }] },
      ]);
    });
  });

  describe("comments", () => {
    it("skips lines starting with #", () => {
      const song = parse("# This is a comment\n{title: Foo}");
      expect(song.nodes).toEqual([
        { type: "directive", name: "title", value: "Foo" },
      ]);
    });

    it("skips comments with leading whitespace", () => {
      const song = parse("  # indented comment\nHello");
      expect(song.nodes).toEqual([
        { type: "line", chords: [{ chord: "", lyric: "Hello" }] },
      ]);
    });
  });

  describe("sections", () => {
    it("parses a chorus section", () => {
      const song = parse(
        "{start_of_chorus}\n[G]La la la\n{end_of_chorus}"
      );
      expect(song.nodes).toEqual([
        {
          type: "section",
          name: "chorus",
          lines: [
            { type: "line", chords: [{ chord: "G", lyric: "La la la" }] },
          ],
        },
      ]);
    });

    it("parses a verse section", () => {
      const song = parse(
        "{start_of_verse}\nHello world\n{end_of_verse}"
      );
      expect(song.nodes).toEqual([
        {
          type: "section",
          name: "verse",
          lines: [
            { type: "line", chords: [{ chord: "", lyric: "Hello world" }] },
          ],
        },
      ]);
    });

    it("parses section with short aliases", () => {
      const song = parse("{soc}\n[G]La la la\n{eoc}");
      expect(song.nodes).toEqual([
        {
          type: "section",
          name: "chorus",
          lines: [
            { type: "line", chords: [{ chord: "G", lyric: "La la la" }] },
          ],
        },
      ]);
    });

    it("parses a section with a label", () => {
      const song = parse(
        "{start_of_chorus: Chorus 2}\n[Am]Hey\n{end_of_chorus}"
      );
      expect(song.nodes).toEqual([
        {
          type: "section",
          name: "chorus",
          label: "Chorus 2",
          lines: [
            { type: "line", chords: [{ chord: "Am", lyric: "Hey" }] },
          ],
        },
      ]);
    });

    it("parses a tab section", () => {
      const song = parse("{sot}\ne|---0---|\n{eot}");
      expect(song.nodes).toEqual([
        {
          type: "section",
          name: "tab",
          lines: [
            { type: "line", chords: [{ chord: "", lyric: "e|---0---|" }] },
          ],
        },
      ]);
    });

    it("parses a bridge section", () => {
      const song = parse("{sob}\n[Em]Bridge line\n{eob}");
      expect(song.nodes).toEqual([
        {
          type: "section",
          name: "bridge",
          lines: [
            { type: "line", chords: [{ chord: "Em", lyric: "Bridge line" }] },
          ],
        },
      ]);
    });

    it("handles empty lines inside sections", () => {
      const song = parse("{sov}\nLine 1\n\nLine 2\n{eov}");
      expect(song.nodes).toEqual([
        {
          type: "section",
          name: "verse",
          lines: [
            { type: "line", chords: [{ chord: "", lyric: "Line 1" }] },
            { type: "empty" },
            { type: "line", chords: [{ chord: "", lyric: "Line 2" }] },
          ],
        },
      ]);
    });

    it("handles directives inside sections", () => {
      const song = parse("{sov}\n{comment: Softly}\n[Am]Hello\n{eov}");
      expect(song.nodes).toEqual([
        {
          type: "section",
          name: "verse",
          lines: [
            { type: "directive", name: "comment", value: "Softly" },
            { type: "line", chords: [{ chord: "Am", lyric: "Hello" }] },
          ],
        },
      ]);
    });

    it("closes an unclosed section at end of input", () => {
      const song = parse("{soc}\n[G]La la la");
      expect(song.nodes).toEqual([
        {
          type: "section",
          name: "chorus",
          lines: [
            { type: "line", chords: [{ chord: "G", lyric: "La la la" }] },
          ],
        },
      ]);
    });
  });

  describe("full song", () => {
    it("parses a complete ChordPro song", () => {
      const input = [
        "{title: Amazing Grace}",
        "{artist: John Newton}",
        "",
        "{start_of_verse}",
        "[G]Amazing [G7]grace, how [C]sweet the [G]sound",
        "That [G]saved a [Em]wretch like [D]me",
        "{end_of_verse}",
        "",
        "{start_of_chorus}",
        "[G]I once was [G7]lost, but [C]now am [G]found",
        "{end_of_chorus}",
      ].join("\n");

      const song = parse(input);
      expect(song.nodes).toHaveLength(6);
      expect(song.nodes[0]).toEqual({
        type: "directive",
        name: "title",
        value: "Amazing Grace",
      });
      expect(song.nodes[1]).toEqual({
        type: "directive",
        name: "artist",
        value: "John Newton",
      });
      expect(song.nodes[2]).toEqual({ type: "empty" });

      const verse = song.nodes[3] as Extract<typeof song.nodes[0], { type: "section" }>;
      expect(verse.type).toBe("section");
      expect(verse.name).toBe("verse");
      expect(verse.lines).toHaveLength(2);

      expect(song.nodes[4]).toEqual({ type: "empty" });

      expect(song.nodes[5]).toMatchObject({
        type: "section",
        name: "chorus",
      });
    });
  });

  describe("edge cases", () => {
    it("handles Windows-style line endings", () => {
      const song = parse("{title: Foo}\r\n[Am]Hello\r\n");
      expect(song.nodes).toHaveLength(2);
      expect(song.nodes[0]).toEqual({
        type: "directive",
        name: "title",
        value: "Foo",
      });
      expect(song.nodes[1]).toEqual({
        type: "line",
        chords: [{ chord: "Am", lyric: "Hello" }],
      });
    });

    it("handles directives with leading/trailing whitespace on the line", () => {
      const song = parse("  {title: Foo}  ");
      expect(song.nodes).toEqual([
        { type: "directive", name: "title", value: "Foo" },
      ]);
    });
  });
});
