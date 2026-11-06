# Custom rendering

Use raw tokens and source offsets in your own UI.

Need a selection, a custom component, or a different rendering target? Keep the tokens and take it from there.

```js
import { tokenize, render } from 'kirari'

const tokens = tokenize('const count = 1')
const html = render(tokens, {
  classes: { comment: 'muted' },
  className: token =>
    token.type === 'variable' ? 'selected-name' : undefined,
})
```

Example token: `{ type: 'variable', value: 'count', start: 6, end: 11 }`

Offsets use UTF-16 code units, just like JavaScript’s `slice`. The start is inclusive, the end exclusive. Joining token values always reconstructs the original source.

For React or another UI framework, render each token’s `value` as text and assign classes yourself. For HTML with source-range annotations or line wrappers, use [`renderDecorated`](/docs/decorations/).
