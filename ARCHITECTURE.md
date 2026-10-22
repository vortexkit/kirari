# Architecture

This is a map of the core package, `packages/kirari/src`, for people changing it. The user
documentation lives in [docs](docs) and on [kirari.sh](https://kirari.sh/docs/).

Kirari turns source text into a flat list of tokens, then renders them. Every token is an
unchanged slice of the source with UTF-16 offsets, and the tokens always cover the whole source
in order. Nothing else is shared between stages: if you can produce such a list, every renderer,
decoration, and integration works with it.

```
source ──▶ language.tokenize or scan ──▶ language.definitions ──▶ tokens ──▶ render
            (lexing, with context)        (function names)                    renderDecorated
                                                                              react, rehype
```

## Languages are data

A language (`types.ts`, `Language`) is mostly data: ordered regex `rules`, an `identifier`
pattern, and word lists for keywords, types, booleans, and nulls. Most files in `languages/`
are only that. Shared rules for C-like syntax are in `grammars/clike.ts`.

A language may add two hooks:

- `tokenize` replaces the default scanner. Use it when rules cannot express a construct, such as
  heredocs (`shell.ts`), nested comments (`clike.ts`, `nestedComments`), or Markdown blocks.
  Most hooks still call `scan` and adjust its output. `scanWithOverrides` covers the common case
  of extending a token, such as a Lua long bracket, and restarting the scan after it.
- `definitions` reclassifies names after lexing. Built-in languages use
  `definitionsFor(syntax)`; see [Function names](#function-names).

## The scanner

`tokenize.ts` holds `scan`, the scanner every rule-based language uses. At each offset it tries,
in order:

1. template text, when inside a JavaScript template literal
2. a regex literal, when the language has them and the previous token allows one
3. the language rules; the first match wins
4. a template opening
5. an identifier, which is then classified as a keyword, type, property, function, or variable
6. a single character of text

Earlier tokens decide how later ones read, so the scanner carries state:

| State | What it decides | Example |
| --- | --- | --- |
| `previous` | the last significant token (not text or comment) | `/` after `=` is a regex, after `x` it is division |
| `frames` | template literal nesting | where `${…}` ends |
| `ScanContext` | braces, parentheses, and TypeScript type positions | `void` in `(): void` is a type |

`scan` is a generator. A caller can pass an offset to `next()` to continue somewhere else. Markup
uses this to hand control back after an embedded JSX element.

## Function look-ahead (JavaScript and TypeScript)

For a name in a JavaScript-like language, the scanner may look ahead to decide whether it is a
function: `name(`, `name<T>(`, `name = async (x) => …`, or `name: function () {}`. The
look-ahead (`grammars/functions.ts`) runs a second scanner from the end of the name and steps over
whole bracket groups. It caches group ends per source, so long signatures are scanned once.

Its result includes `pending` when the answer depends on source that has not arrived yet. Streams
use that to avoid treating such a token as final.

## Function names in other languages

Other languages decide function names after lexing, in `grammars/definitions.ts`.
`classifyDefinitions` works on significant tokens only. It first matches brackets, then marks a
name as a function when it is:

- declared: `def name`, `fn name`, including qualified names such as `def self.name`
- called: `name(`, or `name<T>(` where the language has generic calls
- bound to a function literal: `name = lambda …`, `name: T = |x| …`, `(def name (fn …))`

The algorithm contains no language names. Each language passes a `FunctionSyntax` describing
how it writes functions: its declaration and literal keywords, lambda arrow, annotation style,
and hooks (`forms`, `binding`) for syntax no flag covers, such as C++ lambdas or Clojure `let`
vectors. To support a new language, describe its syntax in its own file; change
`definitions.ts` only when the algorithm itself needs a new capability.

## Markup

`grammars/markup.ts` scans HTML, XML, Vue and Svelte templates, and JSX/TSX with a stack of
frames. A markup frame tracks a tag and its attributes. A code frame wraps a script scanner over
the same source offsets, so expressions inside `{…}` and `<script>` content are scanned as
script. A second element right after a JSX element is accepted only if it closes; otherwise
the scan rolls back and reads it as comparison operators.

`grammars/component.ts` configures Vue and Svelte. Embedded `<script>` and `<style>` content is
tokenized with the language selected by the tag and its `lang` attribute.

## Streaming

`stream.ts` turns appended chunks into patches: "replace tokens from offset `from` with these".
`createTokenStream` picks how much to rescan after each chunk:

| Scanner | Languages | Rescans from |
| --- | --- | --- |
| checkpoint | JavaScript, TypeScript, JSON, JSONC | the last line break with known scanner state |
| resumable | JSX, TSX, Python | the last resume point the grammar reported (`resumable.ts`, `stream/resumable.ts`) |
| full | everything else | the start |

A resume point is a line break where scanning can restart and produce the same tokens as a full
scan. Python also has to know when function classification before a point can no longer change.
`grammars/definitions/state.ts` tracks that, and `stream/resumable.ts` holds back tokens until
then.

Streaming must always match a full `tokenize` of the same source. `test/stream-fuzz.test.ts`
checks this for random sources and chunk sizes.

## Rendering

- `render.ts`: tokens to HTML spans, `kirari-${type}` classes
- `decorations.ts`: the same, plus line wrappers and decorated source ranges
- `packages/react` and `packages/rehype` render tokens to React and HAST nodes

The renderers never retokenize. They rely only on the token contract above.

## Other entry points

- `registry.ts`: resolves labels and filenames (`ts`, `src/app.tsx`) to the languages you pass in
- `markdown.ts`: Markdown that highlights fenced code with a registry
- `languages.ts`: re-exports every built-in language

## Constraints

- The core package has no runtime dependencies.
- Bundle size has budgets; `bun run size` fails when an entry exceeds its budget. Minifiers
  rename local variables but not property names, so new state on hot internal objects costs
  bytes in every bundle.
- Known accuracy limits are marked `// shortcut:` in the code, each naming what a parser would
  be needed for. User-facing limits are in [docs/accuracy.md](docs/accuracy.md).
