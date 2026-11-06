import { highlight } from 'kirari'
import { tokenize, type Language } from 'kirari/core'
import { javascript } from 'kirari/languages'
import { python } from 'kirari/languages/python'
import { createTokenStream } from 'kirari/stream'
import { createRegistry } from 'kirari/registry'
import { createMarkdown } from 'kirari/markdown'
import { renderDecorated } from 'kirari/decorations'
import rehypeKirari, { type Options } from 'kirari-rehype'
import { Code, type CodeProps } from 'kirari-react'
import { applyPatch } from 'kirari-react/stream'
import type { Root } from 'hast'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'

const source = 'const label = "<dock>"'
if (!highlight(source).includes('&lt;dock&gt;')) throw new Error('HTML escaping')
const language: Language = python
if (tokenize('print(value)', language)[0]?.type !== 'function') throw new Error('Language export')
const tokens = createTokenStream(javascript).end(source).tokens
if (JSON.stringify(tokens) !== JSON.stringify(tokenize(source, javascript))) throw new Error('Stream parity')
if (!renderDecorated(tokens, { lines: true }).includes('data-line="1"')) throw new Error('Decorations export')
const registry = createRegistry([javascript])
if (registry.resolve('example.js') !== javascript) throw new Error('Registry export')
if (!tokenize('```js\nconst n = 1\n```', createMarkdown(registry)).some(t => t.type === 'keyword')) {
  throw new Error('Markdown export')
}

const tree: Root = { type: 'root', children: [{
  type: 'element', tagName: 'pre', properties: {}, children: [{
    type: 'element', tagName: 'code', properties: { className: ['language-js'] },
    data: { meta: '{1}' }, children: [{ type: 'text', value: source }],
  }],
}] }
const options: Options = {
  languages: [javascript], lines: true,
  className: token => token.type === 'variable' ? 'custom-variable' : undefined,
  lineClassName: line => line.number === 1 ? 'opening-line' : undefined,
}
rehypeKirari(options)(tree)
const output = JSON.stringify(tree)
for (const expected of ['kirari-keyword', 'custom-variable', 'opening-line', 'kirari-line-highlighted']) {
  if (!output.includes(expected)) throw new Error(`Missing Rehype output: ${expected}`)
}

const props: CodeProps = { language: python, highlightLines: [1], tokenClassName: token => token.type === 'function' ? 'call' : undefined }
const markup = renderToStaticMarkup(createElement(Code, props, 'print(answer)'))
for (const expected of ['kirari-line-highlighted', 'kirari-function call', 'data-line="1"']) {
  if (!markup.includes(expected)) throw new Error(`Missing React output: ${expected}`)
}
const patched = applyPatch([], createTokenStream(javascript).end(source))
if (JSON.stringify(patched) !== JSON.stringify(tokenize(source, javascript))) throw new Error('React stream export')
console.log('Packed public APIs work')
