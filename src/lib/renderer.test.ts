import { describe, it, expect } from "vitest";
import { render } from "./renderer.js";
import { Song } from "./types.js";

describe("render", () => {
  it("returns empty string for an empty song", () => {
    expect(render({ nodes: [] })).toBe("");
  });

  describe("directives", () => {
    it("renders a title as h1", () => {
      const song: Song = {
        nodes: [{ type: "directive", name: "title", value: "My Song" }],
      };
      expect(render(song)).toBe('<h1 class="song-title">My Song</h1>');
    });

    it("renders a subtitle as h2", () => {
      const song: Song = {
        nodes: [{ type: "directive", name: "subtitle", value: "The Artist" }],
      };
      expect(render(song)).toBe(
        '<h2 class="song-subtitle">The Artist</h2>'
      );
    });

    it("renders a comment as italic paragraph", () => {
      const song: Song = {
        nodes: [{ type: "directive", name: "comment", value: "Capo 2" }],
      };
      expect(render(song)).toBe('<p class="comment">Capo 2</p>');
    });

    it("renders comment_italic with <i> tag", () => {
      const song: Song = {
        nodes: [
          { type: "directive", name: "comment_italic", value: "softly" },
        ],
      };
      expect(render(song)).toBe(
        '<p class="comment comment-italic"><i>softly</i></p>'
      );
    });

    it("renders comment_box with box class", () => {
      const song: Song = {
        nodes: [{ type: "directive", name: "comment_box", value: "Note" }],
      };
      expect(render(song)).toBe(
        '<p class="comment comment-box">Note</p>'
      );
    });

    it("renders unknown directives as meta divs", () => {
      const song: Song = {
        nodes: [{ type: "directive", name: "artist", value: "Someone" }],
      };
      expect(render(song)).toBe(
        '<div class="meta meta-artist">Someone</div>'
      );
    });

    it("escapes HTML in directive values", () => {
      const song: Song = {
        nodes: [
          { type: "directive", name: "title", value: 'Rock & Roll <"Live">' },
        ],
      };
      expect(render(song)).toBe(
        '<h1 class="song-title">Rock &amp; Roll &lt;&quot;Live&quot;&gt;</h1>'
      );
    });
  });

  describe("lyric lines", () => {
    it("renders a plain lyric line without chord spans", () => {
      const song: Song = {
        nodes: [
          { type: "line", chords: [{ chord: "", lyric: "Hello world" }] },
        ],
      };
      expect(render(song)).toBe('<div class="line">Hello world</div>');
    });

    it("renders a line with chords as chord-lyric pairs", () => {
      const song: Song = {
        nodes: [
          {
            type: "line",
            chords: [
              { chord: "Am", lyric: "Hello " },
              { chord: "G", lyric: "world" },
            ],
          },
        ],
      };
      const html = render(song);
      expect(html).toContain('class="line"');
      expect(html).toContain('<span class="chord">Am</span>');
      expect(html).toContain('<span class="lyric">Hello </span>');
      expect(html).toContain('<span class="chord">G</span>');
      expect(html).toContain('<span class="lyric">world</span>');
    });

    it("renders empty chord span for leading text before first chord", () => {
      const song: Song = {
        nodes: [
          {
            type: "line",
            chords: [
              { chord: "", lyric: "Well " },
              { chord: "Am", lyric: "hello" },
            ],
          },
        ],
      };
      const html = render(song);
      // Has chords (Am), so uses chord-lyric structure for all pairs
      expect(html).toContain('<span class="chord"></span>');
      expect(html).toContain('<span class="lyric">Well </span>');
    });

    it("uses non-breaking space for empty lyrics in chord-lyric pairs", () => {
      const song: Song = {
        nodes: [
          {
            type: "line",
            chords: [
              { chord: "Am", lyric: "" },
              { chord: "G", lyric: "Hello" },
            ],
          },
        ],
      };
      const html = render(song);
      expect(html).toContain('<span class="lyric">\u00a0</span>');
    });

    it("escapes HTML in lyrics and chords", () => {
      const song: Song = {
        nodes: [
          {
            type: "line",
            chords: [{ chord: "A<b>", lyric: "x & y" }],
          },
        ],
      };
      const html = render(song);
      expect(html).toContain("A&lt;b&gt;");
      expect(html).toContain("x &amp; y");
    });
  });

  describe("sections", () => {
    it("renders a chorus section with class", () => {
      const song: Song = {
        nodes: [
          {
            type: "section",
            name: "chorus",
            lines: [
              { type: "line", chords: [{ chord: "", lyric: "La la la" }] },
            ],
          },
        ],
      };
      const html = render(song);
      expect(html).toContain('class="section section-chorus"');
      expect(html).toContain("La la la");
    });

    it("renders a section label", () => {
      const song: Song = {
        nodes: [
          {
            type: "section",
            name: "chorus",
            label: "Chorus 2",
            lines: [
              { type: "line", chords: [{ chord: "", lyric: "Hey" }] },
            ],
          },
        ],
      };
      const html = render(song);
      expect(html).toContain('<div class="section-label">Chorus 2</div>');
    });

    it("does not render label div when no label", () => {
      const song: Song = {
        nodes: [
          {
            type: "section",
            name: "verse",
            lines: [
              { type: "line", chords: [{ chord: "", lyric: "Text" }] },
            ],
          },
        ],
      };
      const html = render(song);
      expect(html).not.toContain("section-label");
    });

    it("renders nested directives inside sections", () => {
      const song: Song = {
        nodes: [
          {
            type: "section",
            name: "verse",
            lines: [
              { type: "directive", name: "comment", value: "Softly" },
              {
                type: "line",
                chords: [{ chord: "Am", lyric: "Hello" }],
              },
            ],
          },
        ],
      };
      const html = render(song);
      expect(html).toContain('<p class="comment">Softly</p>');
      expect(html).toContain('<span class="chord">Am</span>');
    });
  });

  describe("empty lines", () => {
    it("renders empty lines as spacer divs", () => {
      const song: Song = {
        nodes: [{ type: "empty" }],
      };
      expect(render(song)).toBe('<div class="empty-line"></div>');
    });
  });

  describe("fullPage option", () => {
    it("wraps output in a full HTML document", () => {
      const song: Song = {
        nodes: [{ type: "directive", name: "title", value: "Test" }],
      };
      const html = render(song, { fullPage: true });
      expect(html).toContain("<!DOCTYPE html>");
      expect(html).toContain("<html");
      expect(html).toContain("<head>");
      expect(html).toContain("<style>");
      expect(html).toContain('<div class="song">');
      expect(html).toContain('<h1 class="song-title">Test</h1>');
      expect(html).toContain("</body>");
      expect(html).toContain("</html>");
    });

    it("includes print-ready CSS", () => {
      const song: Song = {
        nodes: [{ type: "directive", name: "title", value: "Test" }],
      };
      const html = render(song, { fullPage: true });
      expect(html).toContain(".chord-lyric");
      expect(html).toContain(".section-chorus");
      expect(html).toContain("@media print");
    });

    it("returns empty string for empty song even with fullPage", () => {
      expect(render({ nodes: [] }, { fullPage: true })).toBe("");
    });
  });

  describe("integration with parser", async () => {
    const { parse } = await import("./parser.js");

    it("round-trips a full song through parse and render", () => {
      const input = [
        "{title: Amazing Grace}",
        "{subtitle: John Newton}",
        "",
        "{start_of_verse}",
        "[G]Amazing [G7]grace, how [C]sweet the [G]sound",
        "That saved a wretch like me",
        "{end_of_verse}",
        "",
        "{start_of_chorus: Chorus}",
        "[G]I once was [G7]lost",
        "{end_of_chorus}",
      ].join("\n");

      const html = render(parse(input));
      expect(html).toContain('<h1 class="song-title">Amazing Grace</h1>');
      expect(html).toContain('<h2 class="song-subtitle">John Newton</h2>');
      expect(html).toContain('class="section section-verse"');
      expect(html).toContain('class="section section-chorus"');
      expect(html).toContain('<div class="section-label">Chorus</div>');
      expect(html).toContain('<span class="chord">G</span>');
      expect(html).toContain('<span class="chord">G7</span>');
      expect(html).toContain("That saved a wretch like me");
    });
  });
});
