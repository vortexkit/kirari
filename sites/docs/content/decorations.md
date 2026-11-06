# Decorations

Add source ranges and line wrappers to highlighted HTML.

Add classes to source ranges without touching syntax tokens. Optionally wrap each line for line numbers or annotations.

```js
import { tokenize } from 'kirari'
import { renderDecorated } from 'kirari/decorations'

const source = 'const answer = 42\nconsole.log(answer)'
const html = renderDecorated(tokenize(source), {
  decorations: [
    { start: 6, end: 12, className: 'kirari-inserted' },
  ],
  lines: true,
})
```

Output: the first `answer` gets the inserted color; syntax colors stay.

```
const answer = 42
console.log(answer)
```

- Ranges: UTF-16 offsets, `start` inclusive, `end` exclusive. Overlaps combine classes.
- `lines: true` wraps each line in `.kirari-line` with a 1-based `data-line`. Line endings stay outside.
- `lineClassName({ number, start, end })` adds a class per line.

Pass tokens that cover the whole source. Ranges must be nonempty, in bounds, and not split a surrogate pair. A range edge inside a CRLF needs `lines: true`. Output is escaped.
