# Token streaming

`@vortexlabs/kirari/stream` accepts appended source and returns replacement tokens. It has no
DOM, transport, timer, or runtime dependency. Later characters can change earlier
classifications, so patches replace a suffix instead of blindly appending tokens.

```ts
import { render, type Token } from '@vortexlabs/kirari/core'
import { javascript } from '@vortexlabs/kirari/languages'
import { createTokenStream, type TokenPatch } from '@vortexlabs/kirari/stream'

const stream = createTokenStream(javascript)
const tokens: Token[] = []

const apply = (patch: TokenPatch) => {
  while (tokens.length && tokens[tokens.length - 1]!.start >= patch.from) {
    tokens.pop()
  }
  for (const token of patch.tokens) tokens.push(token)
}

apply(stream.write('const message = "hel'))
apply(stream.write('lo";\nconsole.log(message)'))
apply(stream.end())
const html = render(tokens)

// For a new response, reset both the stream and your retained view.
stream.reset()
tokens.length = 0
```

`TokenPatch` has three readonly fields:

| Field | Meaning |
| --- | --- |
| `from` | Inclusive UTF-16 source offset where previous tokens must be replaced |
| `tokens` | Complete replacement suffix, with absolute source offsets |
| `length` | Total accumulated source length in UTF-16 code units |

`from` is a token boundary in the previous result. It is **not an HTML string
offset**. After applying every patch, tokens equal ordinary `tokenize` output for
the accumulated prefix. All source is retained, including incomplete strings,
comments, and split surrogate pairs. Empty writes are no-op patches at `length`.
This parity follows Kirari's lexical classifications, including their existing
limits; it is not a promise of compiler-level parsing.

`end(optionalChunk)` processes the last chunk and closes the stream. Writes or
another `end` after closing throw until `reset()`. A failed write does not advance
the stream. `reset()` clears its source and checkpoint; callers must clear their
retained tokens/rendered view too. Tokens and language definitions are typed
readonly, not frozen at runtime. Do not mutate built-in definitions or their
rules; create a derived definition for custom behavior.

## Performance contract

`stream.mode` is `checkpoint` for the exact built-in JavaScript, TypeScript,
JSX, TSX, JSON, JSONC, and Python definitions imported from the same package
instance. It is `full` for all other definitions, including derived/custom
grammars. Full mode deliberately re-tokenizes all source and returns a patch
from zero. It preserves the same caller API without making unsupported
performance promises.

Checkpoint mode reuses completed lexical context before a safe newline. It keeps
enough trailing input to revise name/key lookahead, CRLF, and template state.
JSX and TSX checkpoints sit outside elements, so a long element is rescanned
from its opening line until it closes, and a sibling element that has not
closed yet keeps the lines after it revisable. Python checkpoints sit outside
f-strings, and function names stay revisable
while later lines can still change them, such as inside an assigned
parenthesis, inside a bracketed annotation, or when the next line starts with
`=` or `:`. Each write still
scans the revisable tail. A long single line, or an unfinished multiline
comment, string, template, or Python triple-quoted string, can keep that tail
large and produce quadratic total work across small chunks. The stream retains
the entire source in memory, plus a checkpoint token; there is no bounded-memory
guarantee.

For live rendering, render only `patch.tokens` and replace the previously
rendered suffix identified by its source offset. Keep source-offset metadata in
your renderer. Rendering the entire accumulated token array after each write
still repeats HTML work, even if tokenization was incremental. The example above
renders once at the end to keep patch application clear; Kirari does not implement
DOM reconciliation. Arbitrary edits before the current end require a reset.

`bun run benchmark:stream` compares full-prefix rendering with checkpoint
tokenization plus rendering replacement tokens at identical update boundaries.
It also measures adverse single-line and open-comment inputs. See the
[benchmark methodology](../packages/benchmarks/README.md) and generated report
for measurements and exclusions. Chunk coalescing is an independent integration
choice: it saves calls by updating the display less often.
