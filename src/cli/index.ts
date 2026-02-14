import { readFileSync } from "node:fs";
import { chordproToHtml } from "../lib/index.js";

const args = process.argv.slice(2);

function printUsage(): void {
  console.error(
    "Usage: chordpro2html [options] <file.chordpro>\n\n" +
    "Options:\n" +
    "  -t, --transpose N  Transpose by N semitones\n" +
    "  -c, --columns N    Number of columns (default: 1)\n" +
    "  -h, --help         Show this help message"
  );
}

let transpose: number | undefined;
let columns: number | undefined;
let file: string | undefined;

for (let i = 0; i < args.length; i++) {
  const arg = args[i];
  if (arg === "-h" || arg === "--help") {
    printUsage();
    process.exit(0);
  } else if (arg === "-t" || arg === "--transpose") {
    const val = args[++i];
    if (val === undefined || isNaN(Number(val))) {
      console.error("Error: --transpose requires a numeric argument");
      process.exit(1);
    }
    transpose = Number(val);
  } else if (arg === "-c" || arg === "--columns") {
    const val = args[++i];
    if (val === undefined || isNaN(Number(val)) || Number(val) < 1) {
      console.error("Error: --columns requires a positive number");
      process.exit(1);
    }
    columns = Number(val);
  } else if (arg.startsWith("-")) {
    console.error(`Unknown option: ${arg}`);
    printUsage();
    process.exit(1);
  } else {
    file = arg;
  }
}

if (!file) {
  printUsage();
  process.exit(1);
}

const input = readFileSync(file, "utf-8");
const html = chordproToHtml(input, { transpose, columns });
process.stdout.write(html);
