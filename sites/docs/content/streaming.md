# Streaming

Apply token patches as source chunks arrive.

`createTokenStream(language)` takes chunks and returns patches. New input can change earlier tokens, so each patch replaces everything after an offset.

```ts
import { render } from '@vortexlabs/kirari/core'
import { createTokenStream } from '@vortexlabs/kirari/stream'
import { javascript } from '@vortexlabs/kirari/languages'
import type { Token } from '@vortexlabs/kirari/core'
import type { TokenPatch } from '@vortexlabs/kirari/stream'

const stream = createTokenStream(javascript)
const tokens: Token[] = []

const apply = (patch: TokenPatch) => {
  while (tokens.length && tokens[tokens.length - 1]!.start >= patch.from) {
    tokens.pop()
  }
  for (const token of patch.tokens) tokens.push(token)
}

apply(stream.write('const ans'))
apply(stream.write('wer = 42;\n'))
apply(stream.end())
const html = render(tokens)

stream.reset()
tokens.length = 0 // Clear consumer state before starting another source.
```

- `patch.from`: source offset (UTF-16), not a token index. Drop tokens from there; append `patch.tokens` (already globally offset).
- `patch.length`: total source length so far.
- `write(chunk)` returns a patch. `end(chunk?)` closes the stream; writes then throw until `reset()`.
- `reset()` doesn’t clear your tokens or output. Do that yourself.

For live output, render only `patch.tokens` and replace that tail of your view. Re-rendering every token on each write repeats work.

**Know the streaming limits**

Only the unmodified built-in JavaScript, TypeScript, JSX, TSX, JSON, JSONC, and Python use `'checkpoint'` mode (`stream.mode`), which rescans less. Everything else, including copies or extensions of those, uses `'full'`: every write retokenizes all source so far.

Even in checkpoint mode, a long line or unclosed multiline token can trigger repeated rescans. Both modes keep the full source in memory. Don’t mutate built-in definitions; copy them.
