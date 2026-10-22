# @vortexlabs/kirari-react

Syntax highlighting for React 19, built on
[`@vortexlabs/kirari`](https://github.com/vortexkit/kirari/blob/main/packages/kirari/README.md).
`<Code>` renders code as React elements and works in Server Components. Use the
optional streaming hook for code that arrives in chunks.

[Documentation](https://kirari.sh/docs/) · [Playground](https://kirari.sh/playground/)

## Install

```sh
npm install @vortexlabs/kirari @vortexlabs/kirari-react
```

Requires React 19. Kirari is a peer dependency.

## Usage

```tsx
import { Code } from '@vortexlabs/kirari-react'
import { typescript } from '@vortexlabs/kirari/languages'
import '@vortexlabs/kirari/theme.css'

export const CodeExample = () => (
  <Code language={typescript}>
    {'const greeting: string = "Hello"'}
  </Code>
)
```

Output is `<pre class="kirari"><code>…</code></pre>` with the standard
`kirari-*` classes, so every Kirari theme works. Code text is escaped by React;
the component does not use `dangerouslySetInnerHTML`. Text children are joined
as React joins text, so `{value}` interpolation works; elements throw. `language`
defaults to JavaScript. Other props go to the `<pre>`.

## Lines and customization

Use `highlightLines={[1, [3, 4]]}` to mark line 1 and lines 3–4. Style
`.kirari-line-highlighted` to choose the highlight's appearance.

| Prop | Effect |
| --- | --- |
| `lines` | Wrap each line in `<span class="kirari-line" data-line="n">`. |
| `highlightLines` | Lines or `[first, last]` ranges get `kirari-line-highlighted`. Implies `lines`. |
| `lineClassName` | `(line) => class` for a line wrapper. `line` is `{ number, start, end }`. |
| `decorations` | `{ start, end, className }` source ranges, as in [decorations](https://github.com/vortexkit/kirari/blob/main/docs/decorations.md). |
| `classes` | Extra classes per token type, e.g. `{ keyword: 'kw' }`. |
| `tokenClassName` | `(token) => class` per token. |
| `tokens` | Pre-scanned tokens instead of `children`. |

Line numbers are CSS:

```css
.kirari-line::before { content: attr(data-line); display: inline-block; width: 3ch; margin-right: 2ch; opacity: 0.5; }
```

## Streaming

```tsx
'use client'

import { Code } from '@vortexlabs/kirari-react'
import { useTokenStream } from '@vortexlabs/kirari-react/stream'
import { javascript } from '@vortexlabs/kirari/languages'
import '@vortexlabs/kirari/theme.css'

export const StreamExample = () => {
  const { tokens, write, reset } = useTokenStream(javascript)

  return (
    <>
      <button type="button" onClick={() => write('const count = 42\n')}>
        Append a line
      </button>
      <button type="button" onClick={reset}>Reset</button>
      <Code tokens={tokens} />
    </>
  )
}
```

This example adds one chunk per click. In your app, call `write(chunk)` as text
arrives. The hook also returns `end()`, which closes the stream when it is complete.

- Built-in JavaScript, TypeScript, JSX, TSX, JSON, JSONC, and Python reuse completed scanning work. Other languages rescan the full source. Long unfinished tokens can still be expensive; see [token streaming](https://github.com/vortexkit/kirari/blob/main/docs/streaming.md).
- Changing `language` starts a new, empty stream.
- After `end()`, call `reset()` before writing again.
- `/stream` is a client module; `<Code>` is not.
- Managing tokens yourself? Use `createTokenStream` from `@vortexlabs/kirari/stream` with `applyPatch(tokens, patch)`.

## License

[MIT](https://github.com/vortexkit/kirari/blob/main/packages/react/LICENSE) © 2026 [Ugi](https://ugi.dev)
