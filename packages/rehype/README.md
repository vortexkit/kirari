# @vortexlabs/kirari-rehype

Highlight code blocks in rendered Markdown and MDX with Kirari. This optional
package converts Kirari tokens directly into structured HTML syntax tree nodes.
It does not generate raw HTML or require a DOM.

Run it while building your content to send highlighted HTML and CSS to the
browser, with no client-side highlighter. The integration is separate from the
core package and does not change its bundle.

[Documentation](https://kirari.sh/docs/) · [Playground](https://kirari.sh/playground/)

## Install

```sh
npm install @vortexlabs/kirari @vortexlabs/kirari-rehype
```

The plugin uses your application's Kirari through a peer dependency.

## Markdown to HTML

Install `unified`, `remark-parse`, `remark-rehype`, and `rehype-stringify` in your
application if it does not already have a Markdown pipeline.

```ts
import { unified } from 'unified'
import remarkParse from 'remark-parse'
import remarkRehype from 'remark-rehype'
import rehypeStringify from 'rehype-stringify'
import rehypeKirari from '@vortexlabs/kirari-rehype'
import { javascript, typescript } from '@vortexlabs/kirari/languages'

const processor = unified()
  .use(remarkParse)
  .use(remarkRehype)
  .use(rehypeKirari, { languages: [javascript, typescript] })
  .use(rehypeStringify)

const source = '```js\nconst answer = 42\n```'
const html = String(await processor.process(source))
```

Import the optional theme once from your application's stylesheet entry point:

```ts
import '@vortexlabs/kirari/theme.css'
```

The plugin adds `.kirari` to the enclosing `<pre>`, preserves existing properties
and the code element's `language-*` class, and adds `.kirari-*` syntax spans.
Customize colors with variables such as `--kirari-keyword` and `--kirari-variable`.

## MDX

Pass the same plugin to the MDX compiler's `rehypePlugins` option:

```ts
import { compile } from '@mdx-js/mdx'
import rehypeKirari from '@vortexlabs/kirari-rehype'
import { javascript } from '@vortexlabs/kirari/languages'

const markdown = '```js\nconst answer = 42\n```'
const compiled = await compile(markdown, {
  rehypePlugins: [[rehypeKirari, { languages: [javascript] }]],
})
```

Frameworks that configure MDX expose this option in different places. Keep the
theme in the application entry point; it does not belong in compiler options.
Custom MDX `pre` and `code` components should forward the generated properties
and children.

## Register only what you need

No languages are registered by default. Import each definition and pass it in
`languages`. Labels resolve through [Kirari's language registry](https://github.com/vortexkit/kirari/blob/main/docs/language-integration.md),
so `js` selects registered JavaScript and `ts` selects registered TypeScript.
There is no language detection or automatic grammar loading. JSX and TSX need
their own definitions.

The plugin only highlights labelled, registered `<code>` elements directly
inside `<pre>` whose children are all text nodes. It leaves unlabelled code,
unknown languages, inline code, and code with existing element children
untouched. A `no-highlight` or `nohighlight` class on either `pre` or `code` also
skips the block. Ordinary Markdown serialization still escapes their text.

`@vortexlabs/kirari/markdown` serves a different purpose: it colors Markdown source itself,
including the fence markers. Use `@vortexlabs/kirari-rehype` when rendering a Markdown
document into HTML or MDX.

## Lines and fence metadata

Add a standalone brace group to a fence's metadata to highlight lines:

````md
```js {2,4-6}
const count = 1
const doubled = count * 2

console.log(count)
console.log(doubled)
console.log('done')
```
````

Line numbers are one-based. Valid metadata enables `.kirari-line` wrappers with
`data-line` attributes and adds `.kirari-line-highlighted` to selected lines.
Malformed groups and groups inside quoted metadata values are ignored.
Metadata is read from `code.data.meta`, as supplied by `remark-rehype` and MDX.

Provide your own line highlight styling:

```css
.kirari-line-highlighted {
  background: var(--kirari-line-background, #7452bd18);
}
```

Use `lines: true` to wrap every highlighted block's lines even without metadata.
The `lineClassName` callback can append your own classes:

```ts
import type { Options } from '@vortexlabs/kirari-rehype'
import { javascript } from '@vortexlabs/kirari/languages'

const options = {
  languages: [javascript],
  lines: true,
  lineClassName: ({ number }) => number === 1 ? 'opening-line' : undefined,
} satisfies Options
```

Line endings remain outside the wrappers. Empty lines are preserved; the
fence's trailing newline does not add an extra line. Callback offsets are UTF-16 code units into the code block's source;
`start` is inclusive and `end` is exclusive and excludes the line ending.
Token class callbacks receive each original token once, even when a token spans
multiple lines.

## Options

The default export is the plugin. `Options` is its exported TypeScript type.

| Option | Default | Behavior |
| --- | --- | --- |
| `languages` | `[]` | Explicit readonly list of Kirari language definitions. |
| `classes` | None | Token category to extra CSS class map, as in Kirari's `RenderOptions`. |
| `className(token)` | None | Extra CSS classes for each original token. |
| `lines` | `false` | Wrap every line of a highlighted block. Valid line metadata also enables wrappers. |
| `lineClassName({ number, start, end })` | None | Extra classes for a line; called only when line wrappers are enabled. |

Custom classes append to the standard Kirari classes. Plain `text` tokens remain
text nodes unless they receive a custom class. Source strings become text node
values, and classes become element properties; the downstream serializer or
MDX compiler handles escaping.

## Pipeline order

Run the plugin after `remark-rehype`, when the document has become an HTML tree,
and before `rehype-stringify`. In MDX, use `rehypePlugins`, not `remarkPlugins`.
Configure one highlighter for a block; this plugin skips existing markup rather
than removing another plugin's spans.

If your pipeline sanitizes HTML, run `rehype-sanitize` before `rehypeKirari` and
preserve the `language-*` classes needed for lookup. If sanitization runs after
highlighting instead, its schema must allow Kirari's span classes, `.kirari` on
`pre`, and `data-line` when lines are enabled.

This plugin does not sanitize the surrounding document or change how your
pipeline handles raw HTML or MDX expressions. Language definitions and callbacks
remain trusted application code.

## License

[MIT](https://github.com/vortexkit/kirari/blob/main/packages/rehype/LICENSE) © 2026 [Ugi](https://ugi.dev)
