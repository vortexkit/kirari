import { expect, test } from 'bun:test'
import { renderToStaticMarkup } from 'react-dom/server'
import { tokenize } from 'kirari/core'
import type { Language } from 'kirari/core'
import { javascript } from 'kirari/languages/javascript'
import { python } from 'kirari/languages/python'
import { createTokenStream } from 'kirari/stream'
import { Code } from '../src/index.js'
import { applyPatch, useTokenStream } from '../src/stream.js'

const source = 'const total = items.reduce((sum, item) => sum + item.price, 0)\n// "done"\nconst label = `${total}`\n'

for (const language of [javascript, python] as Language[]) {
  test(`applied patches reproduce a full scan for ${language.name}`, () => {
    const stream = createTokenStream(language)
    let tokens = applyPatch([], { from: 0, tokens: [], length: 0 })
    for (let index = 0; index < source.length; index += 3) {
      tokens = applyPatch(tokens, stream.write(source.slice(index, index + 3)))
    }
    tokens = applyPatch(tokens, stream.end())
    expect(tokens).toEqual(tokenize(source, language))
  })
}

test('the hook starts empty and its tokens render through Code', () => {
  const Streamed = () => {
    const { tokens } = useTokenStream(javascript)
    return <Code tokens={tokens} />
  }
  expect(renderToStaticMarkup(<Streamed />)).toBe('<pre class="kirari"><code></code></pre>')
})
