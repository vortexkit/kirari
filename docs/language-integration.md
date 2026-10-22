# Language resolution and Markdown fences

These optional entry points connect language labels to the definitions you import. They do not detect a language from source code or load extra grammars. The core API and `@vortexlabs/kirari/languages/markdown` keep their existing behavior.

## Resolve labels and filenames

```ts
import { tokenize, render } from '@vortexlabs/kirari/core'
import { createRegistry } from '@vortexlabs/kirari/registry'
import { javascript, typescript, python } from '@vortexlabs/kirari/languages'

const registry = createRegistry([javascript, typescript, python])
const source = 'const answer: number = 42'
const language = registry.resolve('src/example.ts')
const html = language ? render(tokenize(source, language)) : undefined

registry.resolve(' JS ')        // javascript
registry.resolve('.py')         // python
registry.resolve('src/app.tsx') // undefined: TSX was not registered
```

`createRegistry(languages: readonly Language[]): LanguageRegistry` snapshots the supplied registrations. `registry.resolve(input: string)` returns the original matching `Language` object or `undefined`. It does not mutate the array or language definitions, and registries do not share registrations. Definitions remain caller-owned; treat them as immutable after registration.

Resolution is case insensitive, trims surrounding whitespace, and accepts a leading dot. It checks a complete name or alias first, then a filename, then its final extension. Paths can use `/` or `\`; query strings and fragments are ignored for filename lookup. Exact names such as `c#` are checked before stripping a fragment.

Canonical names always resolve when registered. Common aliases include:

| Definition | Aliases and extensions |
| --- | --- |
| `javascript` | `js`, `mjs`, `cjs` |
| `typescript` | `ts`, `mts`, `cts` |
| `python` | `py`, `pyw`, `pyi` |
| `shell` | `sh`, `bash`, `zsh`, `ksh`, `bashrc`, `zshrc` |
| `markdown` | `md`, `mdown` |
| `yaml` | `yml` |
| `cpp` | `c++`, `cc`, `cxx`, `hpp`, `hh`, `hxx` |
| `csharp` | `c#`, `cs` |
| `plaintext` | `text`, `txt`, `plain` |

The metadata also covers the other built-in definitions' common extensions. Specific definitions such as `jsx`, `tsx`, `jsonc`, `xml`, `vue`, and `svelte` require their own registrations; they do not fall back to JavaScript, JSON, or HTML. `.h` resolves to registered C; the C++ header extensions are listed above.

Known filenames include `Dockerfile`, `Dockerfile.*`, `.env`, `.env.*`, `Makefile`, `GNUmakefile`, `nginx.conf`, `Gemfile`, and `Rakefile`. The Dockerfile and dotenv variants require their respective definitions, even when the suffix could name another language. For example, `.env.json` does not resolve to JSON. These are filename conventions, not content detection.

Custom language names work without extra configuration, including as filename extensions. Canonical names take precedence over built-in aliases regardless of registration order: a custom definition named `js` wins over JavaScript's `js` alias. Empty names and duplicate normalized names throw. The registry module contains only alias metadata and imports no language definitions.

## Embed registered languages in Markdown fences

```ts
import { tokenize, render } from '@vortexlabs/kirari/core'
import { createRegistry } from '@vortexlabs/kirari/registry'
import { createMarkdown } from '@vortexlabs/kirari/markdown'
import { javascript, python, json } from '@vortexlabs/kirari/languages'

const markdown = createMarkdown(createRegistry([javascript, python, json]))
const source = '# Example\n```js\nconst answer = 42\n```\n'
const tokens = tokenize(source, markdown)
const html = render(tokens)
```

`createMarkdown(registry: LanguageRegistry): Language` creates an ordinary Markdown language definition, usable with `tokenize`, `render`, or `highlight`. It reuses the default Markdown tokenizer and replaces only recognized fenced block bodies with tokens from the registered language. The opening and closing lines remain `string` tokens. The first whitespace-delimited word of the info string selects the language, so both `js title="example"` and `src/example.py` work.

Fences follow the existing grammar: at least three backticks or tildes, at most three leading spaces, and a closing fence of the same character with at least the opening length. Closers permit trailing spaces or tabs. Backtick fence info cannot contain a backtick. Unknown or unlabelled fences retain the default single string token. An unfinished recognized fence highlights the body available so far.

Source text, indentation, line endings, and UTF-16 offsets are preserved. Inner tokens use offsets into the complete Markdown source, so render callbacks can use them directly. Rendering continues to escape HTML through the existing renderer.

This is lexical highlighting, not a Markdown-to-HTML parser. It retains the default Markdown grammar's limits, including line-local inline code spans. Markdown embedded in a Markdown fence uses its default lexical tokenization without injecting more fenced languages. No streaming parser state or automatic language detection is added.
