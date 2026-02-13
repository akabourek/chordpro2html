import { readFileSync } from "node:fs";
import { chordproToHtml } from "../lib/index.js";

const args = process.argv.slice(2);

if (args.length === 0) {
  console.error("Usage: chordpro2html <file.chordpro>");
  process.exit(1);
}

const input = readFileSync(args[0], "utf-8");
const html = chordproToHtml(input);
process.stdout.write(html);
