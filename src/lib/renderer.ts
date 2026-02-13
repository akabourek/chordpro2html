import { AstNode, Chord, LyricLine, Directive, Section, Song, RenderOptions } from "./types.js";

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function renderChord(pair: Chord): string {
  const chord = pair.chord
    ? `<span class="chord">${escapeHtml(pair.chord)}</span>`
    : `<span class="chord"></span>`;
  const lyric = `<span class="lyric">${escapeHtml(pair.lyric) || "\u00a0"}</span>`;
  return `<span class="chord-lyric">${chord}${lyric}</span>`;
}

function renderLine(node: LyricLine): string {
  const hasChords = node.chords.some((c) => c.chord !== "");
  if (!hasChords) {
    // Plain lyric line — no chord row needed
    const text = node.chords.map((c) => c.lyric).join("");
    return `<div class="line">${escapeHtml(text)}</div>`;
  }
  const pairs = node.chords.map(renderChord).join("");
  return `<div class="line">${pairs}</div>`;
}

function renderDirective(node: Directive): string {
  const value = escapeHtml(node.value);
  switch (node.name) {
    case "title":
      return `<h1 class="song-title">${value}</h1>`;
    case "subtitle":
      return `<h2 class="song-subtitle">${value}</h2>`;
    case "comment":
      return `<p class="comment">${value}</p>`;
    case "comment_italic":
      return `<p class="comment comment-italic"><i>${value}</i></p>`;
    case "comment_box":
      return `<p class="comment comment-box">${value}</p>`;
    default:
      return `<div class="meta meta-${escapeHtml(node.name)}">${value}</div>`;
  }
}

function renderSection(node: Section): string {
  const label = node.label
    ? `<div class="section-label">${escapeHtml(node.label)}</div>\n`
    : "";
  const inner = node.lines.map(renderNode).join("\n");
  return `<div class="section section-${escapeHtml(node.name)}">\n${label}${inner}\n</div>`;
}

function renderNode(node: AstNode): string {
  switch (node.type) {
    case "line":
      return renderLine(node);
    case "directive":
      return renderDirective(node);
    case "section":
      return renderSection(node);
    case "empty":
      return `<div class="empty-line"></div>`;
  }
}

const DEFAULT_STYLES = `
.song-title { margin: 0 0 0.25em; }
.song-subtitle { margin: 0 0 0.5em; font-weight: normal; }
.comment { font-style: italic; margin: 0.5em 0; }
.comment-box { border: 1px solid #000; padding: 0.25em 0.5em; font-style: normal; }
.section { margin: 1em 0; }
.section-chorus { border-left: 3px solid #000; padding-left: 0.75em; }
.section-tab { font-family: monospace; white-space: pre; font-weight: bold; line-height: 0.5; }
.section-tab .line { display: block; }
.section-label { font-weight: bold; margin-bottom: 0.25em; }
.line { display: flex; flex-wrap: wrap; margin: 0; line-height: 1.1; }
.chord-lyric { display: inline-flex; flex-direction: column; margin-right: 0; }
.chord { font-weight: bold; color: #d00; font-size: 0.9em; min-height: 1.2em; white-space: pre; }
.lyric { white-space: pre; }
.empty-line { height: 1em; }
.meta { color: #666; margin: 0.25em 0; }
@media print { .chord { color: #000; } }
`.trim();

/**
 * Render a Song AST into an HTML string.
 */
export function render(song: Song, options: RenderOptions = {}): string {
  if (song.nodes.length === 0) {
    return "";
  }

  const body = song.nodes.map(renderNode).join("\n");

  if (options.fullPage) {
    return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<style>
${DEFAULT_STYLES}
</style>
</head>
<body>
<div class="song">
${body}
</div>
</body>
</html>`;
  }

  return body;
}
