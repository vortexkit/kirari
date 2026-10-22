# Decorations

`@vortexlabs/kirari/decorations` adds optional range classes and line wrappers to an existing token array. It works on the server without a DOM and keeps the normal `kirari-*` syntax classes. Importing the core renderer does not load this module.

```ts
import { tokenize } from '@vortexlabs/kirari'
import { renderDecorated } from '@vortexlabs/kirari/decorations'

const source = 'const answer = 42\n'
const html = renderDecorated(tokenize(source), {
  decorations: [{ start: 6, end: 12, className: 'search-match' }],
  lines: true,
  lineClassName: line => line.number === 1 ? 'active-line' : undefined,
})
```

The range decorates `answer`. Supply your own CSS for `search-match`, `active-line`, and any desired `.kirari-line` presentation. The renderer returns an HTML fragment; use the same `<pre><code>` container as ordinary highlighting.

## API

```ts
type Decoration = {
  readonly start: number
  readonly end: number
  readonly className: string
}

interface DecoratedRenderOptions extends RenderOptions {
  readonly decorations?: readonly Decoration[]
  readonly lines?: boolean
  readonly lineClassName?: (line: {
    readonly number: number
    readonly start: number
    readonly end: number
  }) => string | undefined
}

renderDecorated(tokens: readonly Token[], options?: DecoratedRenderOptions): string
```

`Decoration` and `DecoratedRenderOptions` are exported from `@vortexlabs/kirari/decorations`. The inherited `classes` and `className` options behave like `render()`: mapped classes and callback classes follow the built-in syntax class. The callback receives each original token object exactly once, even when a range or newline splits that token into several output spans. Range classes follow the custom syntax classes. Overlapping ranges combine classes in the order supplied; class names are not deduplicated.

## Offsets and validation

Range offsets count UTF-16 code units, like JavaScript string indices and Kirari token offsets. Ranges are half-open: `start` is included and `end` is excluded. They may cross token or line boundaries. For example, the emoji in `a🙂b` occupies `[1, 3)`.

Offsets must be finite integers satisfying `0 <= start < end <= source.length`. Empty, reversed, out-of-bounds ranges and endpoints inside a Unicode surrogate pair throw `RangeError`. An empty or whitespace-only range `className` throws `TypeError`.

With ranges or line wrappers enabled, tokens must cover the source contiguously from offset zero, and each token's `end - start` must equal `value.length`. Invalid offsets throw `RangeError`. Neither tokens, decorations, nor option objects are mutated. Without ranges or line wrappers, the function delegates directly to `render()` and returns identical HTML.

## Lines and whitespace

Set `lines: true` to wrap every line in `<span class="kirari-line" data-line="1">…</span>`. `lineClassName` adds escaped classes to those wrappers and is ignored unless `lines` is enabled. Line numbers start at one. Callback offsets exclude the newline and use the same UTF-16 source indices as decorations.

LF, CRLF and standalone CR delimit lines. Their original bytes remain between wrappers. Empty lines get empty wrappers. A trailing newline ends the last line and stays after its wrapper without starting another one. An empty source has one empty line wrapper. Range classes apply to line content; newlines outside the wrappers receive no classes, so a range covering only a newline has no visible effect in line mode. Range boundaries within CRLF are accepted and do not split the emitted CRLF in line mode.

Without line wrappers, ranges can style newline characters. A boundary inside CRLF can place markup between its two source characters; HTML parsers then normalize them separately, potentially displaying two line breaks. Keep range boundaries outside CRLF, or enable `lines: true`, when browser newline presentation matters.

Source text, token type names, and all class strings are HTML-escaped. Decorations accept classes only: they cannot add arbitrary attributes, HTML, or inline styles.
