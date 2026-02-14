import { Song, AstNode, LyricLine, Section, Notation, AccidentalPreference, TransposeOptions } from "./types.js";

/** Semitone values for natural notes in standard notation */
const STANDARD_NOTE_MAP: Record<string, number> = {
  C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11,
};

/** Semitone values for natural notes in German notation (H = B natural, B = Bb) */
const GERMAN_NOTE_MAP: Record<string, number> = {
  C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 10, H: 11,
};

/** Semitone-to-note lookup tables */
const SEMITONE_TO_NOTE: Record<Notation, Record<AccidentalPreference, string[]>> = {
  standard: {
    sharp: ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"],
    flat:  ["C", "Db", "D", "Eb", "E", "F", "Gb", "G", "Ab", "A", "Bb", "B"],
  },
  german: {
    sharp: ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "H"],
    flat:  ["C", "Db", "D", "Eb", "E", "F", "Gb", "G", "Ab", "A", "B", "H"],
  },
};

/** Regex to decompose a chord root: letter + optional accidentals */
const ROOT_REGEX = /^([A-Ha-h])(#{1,2}|b{1,2})?(.*)$/;

/** Accidental semitone offsets */
function accidentalOffset(acc: string): number {
  if (acc === "#") return 1;
  if (acc === "##") return 2;
  if (acc === "b") return -1;
  if (acc === "bb") return -2;
  return 0;
}

/**
 * Transpose a single chord string by the given number of semitones.
 * Returns the original string unchanged if it doesn't match a recognized chord pattern.
 */
function transposeChord(
  chord: string,
  semitones: number,
  noteMap: Record<string, number>,
  noteTable: string[],
): string {
  // Handle slash chords: transpose both parts
  const slashIndex = chord.indexOf("/");
  if (slashIndex !== -1) {
    const main = chord.slice(0, slashIndex);
    const bass = chord.slice(slashIndex + 1);
    const transposedMain = transposeChord(main, semitones, noteMap, noteTable);
    const transposedBass = transposeChord(bass, semitones, noteMap, noteTable);
    return `${transposedMain}/${transposedBass}`;
  }

  const match = chord.match(ROOT_REGEX);
  if (!match) return chord;

  const [, rootRaw, accidental = "", quality] = match;
  const root = rootRaw[0].toUpperCase() + rootRaw.slice(1).toLowerCase();

  if (!(root in noteMap)) return chord;

  const baseSemitone = noteMap[root];
  const offset = accidentalOffset(accidental);
  const newSemitone = ((baseSemitone + offset + semitones) % 12 + 12) % 12;

  return noteTable[newSemitone] + quality;
}

/**
 * Auto-detect the notation system by scanning all chords in the song.
 * If any chord root is H (case-insensitive), it's German notation.
 */
function detectNotation(song: Song): Notation {
  for (const chord of iterateChords(song)) {
    const match = chord.match(ROOT_REGEX);
    if (match) {
      const root = match[1].toUpperCase();
      if (root === "H") return "german";
    }
  }
  return "standard";
}

/**
 * Auto-detect accidental preference by counting sharps vs flats.
 * German notation defaults to flat (since B=Bb is a natural note name).
 */
function detectAccidentalPreference(song: Song, notation: Notation): AccidentalPreference {
  let sharps = 0;
  let flats = 0;

  for (const chord of iterateChords(song)) {
    const match = chord.match(ROOT_REGEX);
    if (match && match[2]) {
      if (match[2].includes("#")) sharps++;
      if (match[2].includes("b")) flats++;
    }
  }

  if (sharps === flats) {
    return notation === "german" ? "flat" : "sharp";
  }
  return flats > sharps ? "flat" : "sharp";
}

/** Iterate over all chord strings in a song */
function* iterateChords(song: Song): Generator<string> {
  for (const node of song.nodes) {
    yield* iterateChordsInNode(node);
  }
}

function* iterateChordsInNode(node: AstNode): Generator<string> {
  if (node.type === "line") {
    for (const pair of node.chords) {
      if (pair.chord) yield pair.chord;
    }
  } else if (node.type === "section") {
    for (const child of node.lines) {
      yield* iterateChordsInNode(child);
    }
  }
}

/** Deep-clone and transpose a LyricLine */
function transposeLine(
  line: LyricLine,
  semitones: number,
  noteMap: Record<string, number>,
  noteTable: string[],
): LyricLine {
  return {
    type: "line",
    chords: line.chords.map((pair) => ({
      chord: pair.chord ? transposeChord(pair.chord, semitones, noteMap, noteTable) : "",
      lyric: pair.lyric,
    })),
  };
}

/** Deep-clone and transpose an AST node */
function transposeNode(
  node: AstNode,
  semitones: number,
  noteMap: Record<string, number>,
  noteTable: string[],
): AstNode {
  switch (node.type) {
    case "line":
      return transposeLine(node, semitones, noteMap, noteTable);
    case "directive":
      if (node.name === "key" && node.value) {
        return { ...node, value: transposeChord(node.value, semitones, noteMap, noteTable) };
      }
      return node;
    case "section": {
      const section: Section = {
        type: "section",
        name: node.name,
        lines: node.lines.map((child) => transposeNode(child, semitones, noteMap, noteTable)),
      };
      if (node.label) section.label = node.label;
      return section;
    }
    default:
      return node;
  }
}

/**
 * Transpose all chords in a Song AST by the given number of semitones.
 * Returns a new Song (does not mutate the original).
 */
export function transpose(song: Song, semitones: number, options: TransposeOptions = {}): Song {
  if (semitones === 0) return song;

  const notation = options.notation ?? detectNotation(song);
  const accPref = options.accidentalPreference ?? detectAccidentalPreference(song, notation);
  const noteMap = notation === "german" ? GERMAN_NOTE_MAP : STANDARD_NOTE_MAP;
  const noteTable = SEMITONE_TO_NOTE[notation][accPref];

  return {
    nodes: song.nodes.map((node) => transposeNode(node, semitones, noteMap, noteTable)),
  };
}
