# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**chordpro2html** is a minimalist TypeScript library that converts [ChordPro](https://www.chordpro.org/chordpro/chordpro-introduction/) format into print-ready HTML (suitable for PDF export). The project has three layers:

1. **Core library** (`src/lib/`) — parser + HTML renderer, the main exportable package
2. **CLI** (`src/cli/`) — command-line interface wrapping the library
3. **Web client** (`src/web/`) — simple browser UI with a ChordPro editor and render preview

## Commands

```bash
npm install          # install dependencies
npm run build        # compile TypeScript
npm run dev          # run web client in dev mode
npm test             # run all tests
npm run test:watch   # run tests in watch mode
npm run lint         # lint with ESLint
npx tsx src/cli/index.ts <file.chordpro>  # run CLI during development
```

## Architecture

```
src/
  lib/
    parser.ts       # ChordPro text -> AST (intermediate representation)
    renderer.ts     # AST -> HTML string
    types.ts        # shared types (AST nodes, options)
    index.ts        # public API entry point
  cli/
    index.ts        # CLI entry point (reads files/stdin, writes HTML)
  web/
    index.html      # single-page app with editor + preview pane
```

The conversion pipeline is: **ChordPro text -> Parser -> AST -> Renderer -> HTML**

The parser must handle the full ChordPro standard: directives (`{title:}`, `{subtitle:}`, `{comment:}`, etc.), inline chords (`[Am]`), sections (`{start_of_chorus}`/`{end_of_chorus}`, `{start_of_verse}`, `{start_of_tab}`, etc.), and metadata.

The HTML output should use semantic CSS classes so print styles can be applied. The goal is clean, minimal HTML that renders well when printed or saved to PDF.

## Conventions

- Language: TypeScript (strict mode)
- Runtime: Node.js
- The library should be usable as `import { chordproToHtml } from 'chordpro2html'`
- Keep dependencies minimal — the core library should have zero runtime dependencies
- Tests live next to source files as `*.test.ts`
