export { parse } from "./parser.js";
export { render } from "./renderer.js";
export { transpose } from "./transpose.js";
export type {
  Song, AstNode, Chord, LyricLine, Directive, Section, EmptyLine,
  RenderOptions, ChordproOptions, TransposeOptions, Notation, AccidentalPreference,
} from "./types.js";

import { parse } from "./parser.js";
import { render } from "./renderer.js";
import { transpose } from "./transpose.js";
import { ChordproOptions } from "./types.js";

/**
 * Convert ChordPro text directly to HTML.
 */
export function chordproToHtml(input: string, options: ChordproOptions = {}): string {
  let song = parse(input);

  if (options.transpose) {
    song = transpose(song, options.transpose, {
      notation: options.notation,
      accidentalPreference: options.accidentalPreference,
    });
  }

  return render(song, options);
}
