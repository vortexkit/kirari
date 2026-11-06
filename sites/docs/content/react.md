# React

Render highlighted code as React elements, on the server or while streaming.

`<Code>` renders tokens as React elements. No `dangerouslySetInnerHTML`, no hooks, so it works as a Server Component. Requires React 19.

```sh
npm install kirari kirari-react
```

```tsx
import { Code } from 'kirari-react'
import { typescript } from 'kirari/languages'
import 'kirari/theme.css'

const source = 'const answer: number = 42'

export const Example = () => (
  <Code language={typescript} highlightLines={[1, [3, 4]]}>
    {source}
  </Code>
)
```

Output: `pre.kirari` with the usual `.kirari-*` classes. Extra props go to the `<pre>`.

Text children join the way React renders text, so `{value}` interpolation works; element children throw.

- `lines`: wrap lines in `.kirari-line` with `data-line`.
- `highlightLines`: lines or `[first, last]` ranges get `.kirari-line-highlighted`.
- `lineClassName`, `decorations`, `classes`, `tokenClassName`: as in [decorations](/docs/decorations/).

## Stream a response

```tsx
'use client'
import { Code } from 'kirari-react'
import { useTokenStream } from 'kirari-react/stream'
import { javascript } from 'kirari/languages'

export const StreamedCode = () => {
  const { tokens, write, end } = useTokenStream(javascript)
  // call write(chunk) as text arrives, then end()
  return <Code tokens={tokens} />
}
```

`useTokenStream` returns `{ tokens, write, end, reset }` and applies token patches as text arrives. Built-in JavaScript, TypeScript, JSX, TSX, JSON, JSONC, and Python reuse completed scanning work; other languages rescan the full source. See [streaming limits](/docs/streaming/). It is client-only; `<Code>` is not.
