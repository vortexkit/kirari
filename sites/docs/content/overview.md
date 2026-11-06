# Introduction

Kirari turns source code into tokens, and tokens into escaped HTML. No DOM, no runtime dependencies, and every color comes from your CSS.

```sh
npm install kirari
```

- [Get started](/docs/#installation): Install and highlight your first snippet.
- [Make it yours](/docs/themes/): Pick one of 21 themes or write your own.
- [Playground](/playground/): Edit code and inspect tokens live.

The API has three core functions: `tokenize` splits source into typed tokens with exact offsets, `render` turns tokens into HTML, and `highlight` does both. Optional entry points add streaming, decorations, and language lookup, and separate packages integrate with Rehype and React.

## Installation

Install from npm and highlight your first snippet.

```sh
npm install kirari

# or
pnpm add kirari
yarn add kirari
bun add kirari
```

### Highlight your first snippet

```js
import { highlight } from 'kirari'
import 'kirari/theme.css'

const html = highlight('const message = "Hello, world!"')
const block = `<pre class="kirari"><code>${html}</code></pre>`
```

`highlight` returns the inner HTML; wrap it in your own `<pre><code>`. JavaScript is the default. `class="kirari"` on the `<pre>` applies the theme’s background and text color.
