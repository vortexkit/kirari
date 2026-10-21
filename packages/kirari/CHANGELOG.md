# @vortexlabs/kirari

## 1.1.1

### Patch Changes

- c40b706: Highlight TypeScript enum declaration names as types.
- 8da3031: Highlight JavaScript, TypeScript, and Python decorator markers as operators and bare decorator names as functions, while preserving qualified names and Python matrix multiplication.
  
  Reduce bundle overhead by consolidating function lookahead, simplifying equivalent JavaScript regexes, and sharing HTML escape replacements.

## 1.1.0

### Minor Changes

- 986f3b1: Shrink the default bundle from about 6.1 KB to about 4.3 KB gzipped. Function definition classification for non-JavaScript languages moved out of the core scanner into a new optional `Language.definitions` hook, so the JavaScript entry and `kirari/core` no longer include it. The built-in definitions that use it (C, C++, C#, Clojure, Dart, Elixir, GLSL, Go, Groovy, Java, Julia, Kotlin, Lua, PHP, PowerShell, Protobuf, Python, R, Ruby, Rust, Scala, Shell, SQL, Swift, and Zig) set the hook themselves, and their output is unchanged.
  
  Classification no longer depends on the definition's `name`. A copy made by spreading a built-in keeps its classification even when renamed, and a custom language that only reuses a built-in name such as `'python'` no longer gets it. Set `definitions: python.definitions` to opt in.

## 1.0.5

### Patch Changes

- 739a67d: Stream built-in JSX, TSX, and JSONC in checkpoint mode. `createTokenStream(tsx)` now rescans from the last newline outside elements instead of retokenizing all accumulated source on every write. Streaming 8 KB of TSX one character at a time drops from about 13 seconds to about 0.2 seconds. Streamed tokens still equal batch tokenization after every write, and copies or extensions of these definitions keep using full mode. A long element rescans from its opening line until it closes, and a sibling element that has not closed yet keeps the lines after it revisable.
  
  No public API changes.
- 452fbd8: Fix streamed JavaScript and TypeScript names whose function check reads past a slash on the last line. The answer was final even though more input could turn the slash into a regex literal and change it; it now stays revisable until that line ends.
- 52ad674: Stream built-in Python in checkpoint mode. `createTokenStream(python)` now rescans from the last safe newline outside f-strings instead of retokenizing all accumulated source on every write, and reclassifies function names only from the last point later input can no longer change. Streaming 8 KB of Python one character at a time drops from about 5 seconds to about 0.1 seconds, and patches start near the end of the source instead of at zero. Streamed tokens still equal batch tokenization after every write, and copies or extensions of the Python definition keep using full mode. Very long lines and unfinished triple-quoted strings still rescan from their start on each write, as in JavaScript, and so does a parenthesized value assigned with `=` until its closing parenthesis arrives.
  
  Fix Python names before a colon being highlighted as functions because of a later line. The check behind `name: Type = lambda: …` continued across newlines, so `ready` in `if ready:`, `items` in `for item in items:`, and `count` in `count: int` became functions when a later statement assigned a lambda. The check now stops at the end of the logical line, as Python does; annotations inside brackets or continued with a backslash still reach their `=`. Python `<` and `>` are no longer paired like generic brackets, so a comparison on a later line cannot hide an annotation's `=`.
  
  Stop `renderDecorated` with `lines: true` from adding an empty last line wrapper after a trailing newline. The newline still follows the last wrapper, so the source text is unchanged. Blank lines before it keep their wrappers, and an empty source still renders one empty line wrapper.
  
  No public API changes.

## 1.0.4

### Patch Changes

- 5357cfc: Fix quadratic scanning time on long runs of short tokens in CSS, Makefile, TOML, YAML, and Markdown with embedded languages. Rules that look ahead past a name no longer rescan the rest of the run at every token, and an unclosed fence on a single line no longer backtracks over the whole line.
  
  YAML numbers, booleans, and nulls now end before `#` only when whitespace precedes it, so `3#x` reads as one plain scalar as in YAML. TOML numbers no longer split names such as `42n`. No public API changes.

## 1.0.3

### Patch Changes

- ed4d49b: Fix function names being highlighted as ordinary variables across the supported programming-language grammars. Recognize language-specific declarations, generic signatures, quoted names, and bindings to explicit function expressions, lambdas, and closures, including Python lambdas, Ruby methods without parentheses, Rust closures, and typed Go function bindings.
  
  Improve JavaScript, JSX, TypeScript, and TSX handling of multiline and parenthesized arrows, nested default parameters, typed bindings, and contextual method names. Preserve batch and streaming consistency while signatures, comments, and arrow operators are incomplete. Embedded code uses the same fixes.
  
  Add regression coverage for all 48 shipped languages, checking source preservation, token offsets, streamed prefixes, ordinary values, immediate invocations, and formats without function declarations. Function recognition remains lexical and does not infer types from aliases or arbitrary call results. No public API changes or new runtime dependencies.

## 1.0.2

### Patch Changes

- 7d3bf4c: Fix JSX and TSX highlighting for adjacent element snippets without requiring a fragment wrapper. Component names and attributes retain their token types across siblings, while comparisons after JSX remain JavaScript.

## 1.0.1

### Patch Changes

- 3ee99c0: Update the package homepage and documentation links to https://kirari.sh.

## 1.0.0

### Major Changes

- 14accd0: Release Kirari 1.0.0 with the core syntax highlighting APIs, Rehype and MDX integration, and React components and streaming hooks. Update the integrations to require Kirari 1.x.

### Minor Changes

- 149d19f: Add named language imports from `@vortexlabs/kirari/languages`, while preserving individual language entry points. Use the shared entry in playground examples.

## 1.0.0

### Major Changes

- Release Kirari 1.0.0 with the core syntax highlighting APIs, Rehype and MDX integration, and React components and streaming hooks. Update the integrations to require Kirari 1.x.
