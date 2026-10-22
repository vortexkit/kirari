# Kirari

A small, dependency-free syntax highlighter. Kirari turns source code into
escaped HTML or a token array on the server, at build time, or in the browser,
without a DOM. The default bundle is about 4.2 KB gzipped; 48 language
definitions and 21 CSS-variable themes are available as separate imports.
It is a lexical highlighter, not a parser.

```sh
npm install @vortexlabs/kirari
```

Documentation and playground: <https://kirari.sh>

## Quick start

In an application that supports CSS imports:

```ts
import { highlight } from '@vortexlabs/kirari'
import '@vortexlabs/kirari/theme.css'

const code = 'const count = 42'
const html = `<pre class="kirari"><code>${highlight(code)}</code></pre>`
```

Use `html` in your page template. `highlight()` returns an escaped HTML fragment;
the wrapper preserves whitespace, and `class="kirari"` applies the theme's
background and base colors. If your app does not support CSS imports, serve the
theme file as a stylesheet.

Kirari uses ES modules and requires an ES2022-compatible runtime. It works without
Bun, Node-specific APIs, or a DOM. Bun is only needed to develop this repository.

## Choose a language

JavaScript is the default. Choose another language by importing its definition:

```ts
import { highlight } from '@vortexlabs/kirari'
import { python } from '@vortexlabs/kirari/languages'

const html = highlight('print(answer)', { language: python })
```

The shared `@vortexlabs/kirari/languages` entry exports all 48 definitions. Named
imports work with bundler tree-shaking. Individual paths such as
`@vortexlabs/kirari/languages/python` remain available to load only that grammar
and its dependencies without a bundler.

JSX and TSX have separate definitions, including markup and embedded expressions:

```ts
import { highlight } from '@vortexlabs/kirari'
import { tsx } from '@vortexlabs/kirari/languages'

const html = highlight('<Button disabled={busy}>{label}</Button>', { language: tsx })
```

For a Python-only bundle, import the language-independent core:

```ts
import { tokenize, render } from '@vortexlabs/kirari/core'
import { python } from '@vortexlabs/kirari/languages'

const html = render(tokenize('answer = 42', python))
```

## Themes

Import one theme with your application's CSS bundler, or serve its file as a
stylesheet. Add `class="kirari"` to your `<pre>` for the theme's background and
base colors.

```js
import '@vortexlabs/kirari/themes/github-light.css'
```

| Light | Dark |
| --- | --- |
| `daylight`, `paper`, `ad-astra-light`, `github-light`, `solarized-light`, `catppuccin-latte`, `rose-pine-dawn`, `vitesse-light` | `default`, `dusk`, `ad-astra-dark`, `github-dark`, `one-dark`, `dracula`, `nord`, `monokai`, `solarized-dark`, `catppuccin-mocha`, `tokyo-night`, `rose-pine`, `vitesse-dark` |

Use this instead of the default theme import. Load one theme per page; each file
styles the same classes. Ported themes adapt the original projects' published
colors to Kirari's token categories, credited in each file's header.

Override token colors on any ancestor:

```css
.code-example {
  --kirari-background: #151820;
  --kirari-text: #dce1ea;
  --kirari-keyword: #c4a7ff;
  --kirari-variable: #dce1ea;
  --kirari-property: #82d4d0;
  --kirari-function: #9dbdff;
  --kirari-string: #a9d994;
  --kirari-number: #f3c78a;
  --kirari-comment: #949cab;
  --kirari-tag: #e9a6b1;
  --kirari-attribute: #82d4d0;
  --kirari-entity: #f3c78a;
}
```

Every built-in token category maps to `.kirari-<token>` and `--kirari-<token>`:
`text`, `keyword`, `variable`, `property`, `function`, `string`, `number`,
`boolean`, `null`, `comment`, `operator`, `punctuation`, `type`, `regex`,
`inserted`, `deleted`, `heading`, `tag`, `attribute`, and `entity`.
`--kirari-background` controls the optional
wrapper background. Colors are CSS fallbacks, so ancestor overrides inherit
without competing with variable declarations inside the theme.

There are no inline styles. Theme changes do not require highlighting again.
Classes also let you control font weight, italics, backgrounds, and decoration:

```css
.code-example .kirari-keyword { font-weight: 600; }
.code-example .kirari-comment { font-style: italic; }
.code-example .selected { background: #ffffff20; text-decoration: underline; }
```

## Tokens and custom classes

```ts
import { tokenize, render } from '@vortexlabs/kirari'

const tokens = tokenize('const count = 1')
// { type: 'variable', value: 'count', start: 6, end: 11 }

const html = render(tokens, {
  classes: { variable: 'code-name', comment: 'muted' },
  className: token => token.start === 6 ? 'selected' : undefined,
})
```

`highlight` accepts the same rendering options. Custom classes append to the
standard class. Plain `text` tokens render without a span unless given custom
classes. Tokens are readonly in TypeScript; the library does not mutate them
when rendering. They are not frozen at runtime.

Offsets use UTF-16 code units, matching JavaScript's `slice`. `start` is inclusive
and `end` is exclusive. Tokens cover the entire input in order, including unknown
characters and unfinished code. Concatenating their values reproduces the source
exactly. An empty source produces `[]` and empty HTML.

Use these tokens directly when rendering through React or another UI framework.
Kirari does not require a framework adapter or expose a raw-HTML callback. For
React, the optional [`@vortexlabs/kirari-react`](https://github.com/vortexkit/kirari/blob/main/packages/react/README.md) package
provides a ready-made `<Code>` component and streaming hook.

## Optional integrations

These features use separate entrypoints and are absent from the default bundle:

| Import | API | Purpose |
| --- | --- | --- |
| `@vortexlabs/kirari/stream` | `createTokenStream(language)` | Source-offset token patches for appended code |
| `@vortexlabs/kirari/decorations` | `renderDecorated(tokens, options)` | Overlapping source ranges and optional line classes |
| `@vortexlabs/kirari/registry` | `createRegistry(languages)` | Resolve names, aliases, extensions, and filenames from explicit registrations |
| `@vortexlabs/kirari/markdown` | `createMarkdown(registry)` | Highlight registered languages inside Markdown fences |

```ts
import { tokenize } from '@vortexlabs/kirari/core'
import { javascript } from '@vortexlabs/kirari/languages'
import { renderDecorated } from '@vortexlabs/kirari/decorations'
import { createRegistry } from '@vortexlabs/kirari/registry'
import { createMarkdown } from '@vortexlabs/kirari/markdown'

const registry = createRegistry([javascript])
registry.resolve('src/example.js') // javascript; unknown names return undefined
const markdown = createMarkdown(registry)
const tokens = tokenize('```js\nconst count = 1\n```', markdown)
const html = renderDecorated(tokens, {
  lines: true,
  lineClassName: line => line.number === 2 ? 'selected-line' : undefined,
})
```

Decorations accept `{ start, end, className }` ranges using UTF-16 offsets.
They append escaped classes without changing token categories. Callbacks see
each original token once, even when a range splits it. With `lines: true`, output
uses `.kirari-line` wrappers and one-based `data-line` attributes. Define your own
CSS for custom classes; line numbering UI is not added automatically.

Streaming returns `{ from, tokens, length }`: replace your retained tokens from
the source offset `from` onward. Exact built-in JavaScript, TypeScript, JSX, TSX,
JSON, JSONC, and Python use conservative checkpoints; all other grammars use full re-tokenization.
Long lines and unfinished multiline tokens can still require large rescans.
Streams retain the full source. Do not mutate built-in definitions; copy them
for customization. Calling `reset()` also requires clearing your retained view.

See complete [streaming](https://github.com/vortexkit/kirari/blob/main/docs/streaming.md),
[decoration](https://github.com/vortexkit/kirari/blob/main/docs/decorations.md), and
[language integration](https://github.com/vortexkit/kirari/blob/main/docs/language-integration.md) contracts and examples.

For highlighted code blocks in rendered Markdown or MDX, use the separate
[`@vortexlabs/kirari-rehype` package](https://github.com/vortexkit/kirari/blob/main/packages/rehype/README.md). It accepts explicit language
registrations and reuses Kirari token classes. The `createMarkdown()` API above
highlights Markdown source; the Rehype plugin integrates with document rendering.

## Extend a language

```ts
import { highlight } from '@vortexlabs/kirari'
import { javascript } from '@vortexlabs/kirari/languages'
import type { Language } from '@vortexlabs/kirari'

const projectJavaScript: Language = {
  ...javascript,
  keywords: [...javascript.keywords!, 'custom'],
  rules: [
    { type: 'constant', pattern: /\bAPI_KEY\b/ },
    ...javascript.rules,
  ],
}

highlight('const key = API_KEY', { language: projectJavaScript })
```

Give a custom category its own CSS:

```css
.kirari-constant { color: var(--kirari-constant, #f3c78a); }
```

Rules are ordered and match at the current source position. Earlier rules win;
an empty match throws. Kirari clones regular expressions, preserving their flags
except that matching always uses sticky mode. It never changes the supplied
regex's `lastIndex`. Copy definitions when extending them; built-in values are
typed readonly but not deeply frozen at runtime.

JavaScript template text and regex literals use scanner state. Normal rules run
inside template expressions, but not inside template text or recognized regex
literals. Disable `templates` or `regexLiterals` on a derived definition if you
want rules to take over those constructs.

Definitions accept `name`, `rules`, `identifier`, `keywords`, `types`, `booleans`,
`nulls`, `templates`, `regexLiterals`, and optional `tokenize` and `definitions`
callbacks. `definitions(tokens)` runs after tokenizing and can retype names as
functions; built-in definitions that classify function definitions set it, and
copies made with a spread keep it even when renamed.
Optional identifier patterns enable
lexical variable/property/function classification. With no identifier pattern,
unmatched characters remain `text`. There is no global language registry.

The optional `tokenize(source, language)` callback replaces the default scanner
and returns a complete `Token[]` with contiguous source offsets. Built-in
definitions use it where structure matters, such as JSX, CSS, and YAML.
JSX/TSX rules apply within code expressions; HTML/XML markup uses its own scanner.
Changing `rules` therefore does not override every construct in these definitions.
Custom rendering and classes work with every language.

## Languages and limits

There are 48 opt-in definitions. Import only the ones your application needs;
the default entry includes JavaScript, without a registry of the other languages.

| Import suffix | Support |
| --- | --- |
| `javascript` | Keywords, Unicode identifiers, common property/call contexts, numbers, comments, strings, nested templates, regex heuristics |
| `typescript` | JavaScript plus TypeScript keywords and primitive type names |
| `jsx` | JavaScript plus tags, attributes, entities, fragments, and embedded expressions |
| `tsx` | JSX plus TypeScript keywords and primitive types |
| `html` | Tags, attributes, entities, comments, raw text, embedded JavaScript/CSS |
| `xml` | Tags, attributes, entities, comments, processing instructions, CDATA |
| `vue` | Markup, directives, interpolations, JavaScript/TypeScript scripts, CSS |
| `svelte` | Markup, block markers, expression attributes, scripts, CSS |
| `css` | Selectors, declarations, custom properties, dimensions, colors, at-rules |
| `json` | Keys, strings, numbers, booleans, null, punctuation |
| `jsonc` | JSON plus line and block comments |
| `python` | Keywords, identifiers, numbers, quoted/triple strings, f-string expressions, comments |
| `shell` | Keywords, names, quoted parameters, nested expansions, heredocs, strings, comments |
| `c` | Keywords, primitive types, directives, strings, numbers, comments |
| `cpp` | C++ keywords, scoped names, raw strings, directives |
| `csharp` | Keywords, types, escaped identifiers, verbatim/interpolated/raw strings |
| `java` | Keywords, primitive types, annotations, strings, text blocks |
| `go` | Keywords, types, raw strings, runes, imaginary numbers |
| `rust` | Keywords, types, lifetimes, raw identifiers/strings, macros, nested comments |
| `ruby` | Keywords, symbols, variables, percent literals, regex heuristics |
| `php` | Tags, keywords, variables, strings, heredoc/nowdoc |
| `swift` | Keywords, types, attributes, raw/multiline strings, nested comments |
| `kotlin` | Keywords, types, annotations, raw strings, nested comments |
| `dart` | Keywords, types, annotations, raw/triple strings, nested comments |
| `scala` | Keywords, types, annotations, triple strings, nested comments |
| `groovy` | Keywords, annotations, quoted/triple strings, slashy strings |
| `lua` | Keywords, literals, quoted/long-bracket strings and comments |
| `zig` | Keywords, types, builtins, multiline strings, comments |
| `glsl` | Shader keywords, types, directives, numbers, comments |
| `r` | Keywords, literals, operators, strings, comments |
| `julia` | Keywords, types, macros, strings, nested comments |
| `elixir` | Keywords, atoms, aliases, sigils, strings, heredocs |
| `clojure` | Forms, symbols, keywords, strings, regexes, reader syntax |
| `powershell` | Case-insensitive keywords, variables, parameters, strings, here-strings |
| `sql` | Common case-insensitive keywords, strings, quoted identifiers, parameters |
| `markdown` | Headings, links, emphasis, inline code, opaque fenced code blocks |
| `yaml` | Keys, sequences, anchors, tags, scalar values, indented block scalars |
| `toml` | Tables, dotted keys, dates, strings, arrays, literals |
| `dockerfile` | Directives, comments, variables, flags, continuations |
| `graphql` | Operations, types, variables, directives, block strings |
| `protobuf` | Declarations, field types, strings, numbers, comments |
| `hcl` | HCL/Terraform blocks, attributes, literals, strings, heredocs |
| `ini` | Sections, keys, values, comments |
| `dotenv` | Export declarations, keys, quoted/unquoted values, comments |
| `makefile` | Targets, variables, assignments, directives, recipes |
| `nginx` | Directive names, variables, quoted/unquoted values, comments |
| `diff` | Unified diff headers, hunks, added/deleted lines |
| `plaintext` | Escaped text without syntax coloring |

Kirari highlights source text without validating programs, resolving bindings,
or inferring types. Coverage varies by language; malformed and incomplete code
is preserved, but its coloring may differ from a compiler's interpretation.

Supported cases include escaped JavaScript identifiers, nested TSX tag type
arguments, Python f-string expressions, and shell parameters and heredocs.
TypeScript type contexts and JavaScript regex-versus-division decisions still
use lexical heuristics. See [syntax coverage and limits](https://github.com/vortexkit/kirari/blob/main/docs/accuracy.md)
for the tested cases and remaining boundaries.

Source and class attributes are HTML-escaped. Language rules and callbacks are
trusted application code; arbitrary user-supplied regexes are not sandboxed.

## Bundle measurement

Run `bun run size` to measure core-only, default JavaScript, and all 48
language definitions. It bundles each entry for the browser with Bun minification,
checks that the bundle executes, and reports bytes before and after gzip level 9.
The core fixture includes an exported API object; the all-language fixture also
retains a language registry so that no language gets removed as unused. Theme
CSS is excluded. These are bundle sizes, not throughput benchmarks.

Measured on 2026-10-22 using Bun 1.3.4:

| Entry | Minified bytes | Gzip bytes |
| --- | ---: | ---: |
| Core API | 8,527 | 3,735 |
| JavaScript default | 9,700 | 4,252 |
| All 48 languages | 69,243 | 23,171 |

## Development

After cloning the repository, run these commands from its root:

```sh
bun install
bun run check:library
bun run size
```

See [Contributing](https://github.com/vortexkit/kirari/blob/main/CONTRIBUTING.md) for setup and checks, and
[benchmark methodology](https://github.com/vortexkit/kirari/blob/main/packages/benchmarks/README.md) for measurements. Applications
using the published package do not need to build it first.

## License

[MIT](https://github.com/vortexkit/kirari/blob/main/packages/kirari/LICENSE) © 2026 [Ugi](https://ugi.dev)
