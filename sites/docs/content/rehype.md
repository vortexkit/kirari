# Rehype & MDX

Highlight code blocks while building Markdown and MDX documents.

`@vortexlabs/kirari-rehype` highlights code blocks in Markdown and MDX at build time. The browser gets plain HTML and CSS, no highlighter.

Different from [Markdown fences](/docs/markdown/): that highlights Markdown *source*. This plugin highlights code blocks in the rendered document.

```sh
npm install @vortexlabs/kirari @vortexlabs/kirari-rehype
```

```js
import { unified } from 'unified'
import remarkParse from 'remark-parse'
import remarkRehype from 'remark-rehype'
import rehypeStringify from 'rehype-stringify'
import rehypeKirari from '@vortexlabs/kirari-rehype'
import { javascript } from '@vortexlabs/kirari/languages'

const processor = unified()
  .use(remarkParse)
  .use(remarkRehype)
  .use(rehypeKirari, { languages: [javascript] })
  .use(rehypeStringify)

const markdown = '```js\nconst answer = 42\n```'
const html = String(await processor.process(markdown))
```

Pass the languages you need; labels like `js` resolve via the registry. Nothing is auto-loaded or detected. Skipped: unknown or unlabeled blocks, inline code, and code that already has child elements.

## Use it with MDX

```js
import { compile } from '@mdx-js/mdx'
import rehypeKirari from '@vortexlabs/kirari-rehype'
import { javascript } from '@vortexlabs/kirari/languages'

const markdown = '```js\nconst answer = 42\n```'
const compiled = await compile(markdown, {
  rehypePlugins: [[rehypeKirari, { languages: [javascript] }]],
})
```

Import `@vortexlabs/kirari/theme.css` once. Blocks get `pre.kirari` and the usual `.kirari-*` classes and variables. Custom MDX code components must forward props and children.

## Point readers to a line

A fence such as ```` ```js {2,4-6} ```` adds `.kirari-line-highlighted` to lines 2 and 4–6. Style it yourself:

```css
.kirari-line-highlighted {
  background: var(--kirari-line-background, #7452bd18);
}
```

Other options: `lines: true` wraps lines without metadata; `lineClassName({ number, start, end })` (1-based, UTF-16 offsets within the block); `classes` and `className(token)` as in [core](/docs/rendering/). Full type: `Options`.

Order: after `remark-rehype`, before stringify. With `rehype-sanitize`, sanitize first and keep language classes. Don’t run a second highlighter on the same blocks. Invalid line metadata, and braces inside quoted meta values, are ignored.
