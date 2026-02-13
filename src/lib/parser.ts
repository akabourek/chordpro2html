import { AstNode, Chord, LyricLine, Song, Section } from "./types.js";

/** Short directive names mapped to their canonical long forms. */
const DIRECTIVE_ALIASES: Record<string, string> = {
  t: "title",
  st: "subtitle",
  c: "comment",
  ci: "comment_italic",
  cb: "comment_box",
  soc: "start_of_chorus",
  eoc: "end_of_chorus",
  sov: "start_of_verse",
  eov: "end_of_verse",
  sot: "start_of_tab",
  eot: "end_of_tab",
  sob: "start_of_bridge",
  eob: "end_of_bridge",
  sog: "start_of_grid",
  eog: "end_of_grid",
};

/** Section start directives mapped to their section name. */
const SECTION_START: Record<string, string> = {
  start_of_chorus: "chorus",
  start_of_verse: "verse",
  start_of_tab: "tab",
  start_of_bridge: "bridge",
  start_of_grid: "grid",
};

/** Section end directives mapped to their section name. */
const SECTION_END: Record<string, string> = {
  end_of_chorus: "chorus",
  end_of_verse: "verse",
  end_of_tab: "tab",
  end_of_bridge: "bridge",
  end_of_grid: "grid",
};

/**
 * Parse a lyric line containing optional inline chords like `[Am]Hello [G]world`.
 */
function parseLyricLine(line: string): LyricLine {
  const chords: Chord[] = [];
  const regex = /\[([^\]]*)\]/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = regex.exec(line)) !== null) {
    // Text before this chord (only if before the first chord)
    if (match.index > lastIndex) {
      const textBefore = line.slice(lastIndex, match.index);
      if (chords.length === 0) {
        // Leading text with no chord
        chords.push({ chord: "", lyric: textBefore });
      } else {
        // Append to previous chord's lyric
        chords[chords.length - 1].lyric += textBefore;
      }
    }

    chords.push({ chord: match[1], lyric: "" });
    lastIndex = regex.lastIndex;
  }

  // Remaining text after the last chord
  const trailing = line.slice(lastIndex);
  if (chords.length === 0) {
    // No chords at all — plain lyric line
    chords.push({ chord: "", lyric: trailing });
  } else {
    chords[chords.length - 1].lyric += trailing;
  }

  return { type: "line", chords };
}

/**
 * Parse a directive line like `{title: My Song}` or `{c: This is a comment}`.
 * Returns the canonical name and the value (empty string if no value).
 */
function parseDirective(content: string): { name: string; value: string } {
  // Content is everything between { and }
  const colonIndex = content.indexOf(":");
  let name: string;
  let value: string;

  if (colonIndex === -1) {
    name = content.trim();
    value = "";
  } else {
    name = content.slice(0, colonIndex).trim();
    value = content.slice(colonIndex + 1).trim();
  }

  // Normalize to lowercase and resolve aliases
  name = name.toLowerCase();
  name = DIRECTIVE_ALIASES[name] ?? name;

  return { name, value };
}

/**
 * Parse ChordPro-formatted text into an AST.
 */
export function parse(input: string): Song {
  const trimmed = input.trimEnd();
  if (trimmed === "") {
    return { nodes: [] };
  }

  const lines = trimmed.split(/\r?\n/);
  const nodes: AstNode[] = [];
  let currentSection: Section | null = null;

  for (const rawLine of lines) {
    const line = rawLine.trimEnd();

    // Skip comment lines
    if (line.trimStart().startsWith("#")) {
      continue;
    }

    // Empty line
    if (line.trim() === "") {
      const node: AstNode = { type: "empty" };
      if (currentSection) {
        currentSection.lines.push(node);
      } else {
        nodes.push(node);
      }
      continue;
    }

    // Check for directive: {name} or {name: value}
    const directiveMatch = line.trim().match(/^\{([^}]+)\}$/);
    if (directiveMatch) {
      const { name, value } = parseDirective(directiveMatch[1]);

      // Section start
      if (name in SECTION_START) {
        currentSection = {
          type: "section",
          name: SECTION_START[name],
          lines: [],
        };
        if (value) {
          currentSection.label = value;
        }
        continue;
      }

      // Section end
      if (name in SECTION_END) {
        if (currentSection) {
          nodes.push(currentSection);
          currentSection = null;
        }
        continue;
      }

      // Regular directive
      const node: AstNode = { type: "directive", name, value };
      if (currentSection) {
        currentSection.lines.push(node);
      } else {
        nodes.push(node);
      }
      continue;
    }

    // Lyric/chord line
    const node = parseLyricLine(line);
    if (currentSection) {
      currentSection.lines.push(node);
    } else {
      nodes.push(node);
    }
  }

  // Close any unclosed section
  if (currentSection) {
    nodes.push(currentSection);
  }

  return { nodes };
}
