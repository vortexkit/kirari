# Scope & limits

Lexical coverage, trusted grammars, and runtime support.

Kirari highlights syntax. It doesn’t validate programs, resolve bindings, or infer types. Incomplete code is preserved, even when its classification is approximate.

## Language coverage

Context-sensitive syntax uses heuristics. Python f-string expressions are highlighted. Interpolation in several other languages remains inside string tokens. Markdown fences are opaque by default; [`createMarkdown`](/docs/markdown/) enables registered fence languages. SQL dialect extensions remain limited. Shell heredocs are supported, but heredocs inside command substitutions and Bash ANSI-C quoted delimiters require further parsing. TSX type arguments on JSX tags, including nested arguments, preserve tag and attribute boundaries. Generic arrow functions, comparisons, and incomplete markup still use lexical heuristics.

Vue `v-pre` and expressions inside quoted Svelte attributes are not parsed. Unknown script/style preprocessors remain plain text. Advanced reader forms, custom string macros, and configuration dialects can receive approximate categories.

## Runtime and security

Modern ESM runtimes with ES2022 features are required. The library has no DOM, Node, or Bun runtime imports. Source and class attributes are escaped. Custom regex rules and callbacks are trusted code; arbitrary user-supplied grammars are not sandboxed.

## Bundle measurements

The JavaScript entry measures 4,294 bytes gzip; all 48 definitions together measure 23,273 bytes gzip. Measured on 2026-10-22 with Bun 1.3.4 minification and gzip level 9, excluding CSS. These are library bundle sizes, not website sizes or throughput benchmarks.

To reproduce, run `bun run size` in the Kirari repository.

See the [syntax coverage guide](https://github.com/vortexkit/kirari/blob/main/docs/accuracy.md) for tested cases and remaining language boundaries.
