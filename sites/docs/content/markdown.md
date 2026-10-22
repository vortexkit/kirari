# Markdown fences

Resolve language aliases and highlight fenced code blocks.

Build a registry from the languages you import, then pass it to `createMarkdown` to highlight fence bodies. The registry resolves names, aliases, and filenames.

````js
import { tokenize, render } from '@vortexlabs/kirari/core'
import { createRegistry } from '@vortexlabs/kirari/registry'
import { createMarkdown } from '@vortexlabs/kirari/markdown'
import { javascript, json } from '@vortexlabs/kirari/languages'

const registry = createRegistry([javascript, json])
registry.resolve(' JS ')       // javascript
registry.resolve('data.json')  // json
registry.resolve('app.tsx')    // undefined

const markdown = createMarkdown(registry)
const source = '# Example\n```js\nconst answer = 42\n```'
const html = render(tokenize(source, markdown))
````

````md
# Example
```js
const answer = 42
```

```json
{"ready": true}
```
````

The first word after the fence picks the language. Backtick and tilde fences work, even unclosed. Offsets point into the full Markdown source. Unlabeled or unregistered fences stay plain. Fences nested inside a ```` ```markdown ```` fence aren’t highlighted.

The registry never loads grammars or guesses from content. JSX, TSX, JSONC, XML, Vue, and Svelte need their own definitions. Names beat aliases; duplicate names throw. The plain `languages/markdown` definition doesn’t highlight fences.
