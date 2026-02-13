/** A chord annotation attached to a lyric position */
export interface Chord {
  chord: string;
  lyric: string;
}

/** A line of lyrics with inline chords */
export interface LyricLine {
  type: "line";
  chords: Chord[];
}

/** A directive like {title: ...}, {comment: ...}, etc. */
export interface Directive {
  type: "directive";
  name: string;
  value: string;
}

/** A section (verse, chorus, tab, etc.) */
export interface Section {
  type: "section";
  name: string;
  label?: string;
  lines: AstNode[];
}

/** An empty line */
export interface EmptyLine {
  type: "empty";
}

export type AstNode = LyricLine | Directive | Section | EmptyLine;

/** Top-level AST representing a full ChordPro song */
export interface Song {
  nodes: AstNode[];
}

/** Options for the renderer */
export interface RenderOptions {
  /** Wrap output in a full HTML document (default: false) */
  fullPage?: boolean;
}
