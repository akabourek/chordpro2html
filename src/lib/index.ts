export { parse } from "./parser.js";
export { render } from "./renderer.js";
export type { Song, AstNode, Chord, LyricLine, Directive, Section, EmptyLine, RenderOptions } from "./types.js";

import { parse } from "./parser.js";
import { render } from "./renderer.js";
import { RenderOptions } from "./types.js";

/**
 * Convert ChordPro text directly to HTML.
 */
export function chordproToHtml(input: string, options: RenderOptions = {}): string {
  return render(parse(input), options);
}
