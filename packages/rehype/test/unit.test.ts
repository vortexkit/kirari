import { expect, test } from 'bun:test'
import type { Element, Root } from 'hast'
import type { Language, Token } from 'kirari/core'
import rehypeKirari, { type Options } from '../src/index.js'

const plain: Language = { name: 'plain', rules: [] }

const apply = (source: string, meta: string, options: Options = {}): Element => {
  const code: Element = {
    type: 'element', tagName: 'code', properties: { className: ['language-plain'] },
    data: { meta } as Element['data'], children: [{ type: 'text', value: source }],
  }
  const tree: Root = { type: 'root', children: [{ type: 'element', tagName: 'pre', properties: {}, children: [code] }] }
  rehypeKirari({ languages: [plain], ...options })(tree)
  return code
}

const selected = (code: Element): number[] => {
  return code.children.flatMap(node => node.type === 'element'
    && Array.isArray(node.properties.className) && node.properties.className.includes('kirari-line-highlighted')
    ? [Number(node.properties.dataLine)] : [])
}

test('selection parsing combines groups and ignores an invalid group as a whole', () => {
  const code = apply('one\ntwo\nthree\nfour', '{1, 3-4} {2,0} {4} {99} {1, {2} }')
  expect(selected(code)).toEqual([1, 3, 4])
})

test('selection parsing respects quotes, escapes, and standalone boundaries', () => {
  for (const meta of [
    'filename{2} {1}', '{2}suffix {1}', 'title="name \\" {2} \\"" {1}',
    "title='name {2}' {1}", '\\{2} {1}', 'title="{2}" {1}',
  ]) {
    expect(selected(apply('one\ntwo', meta))).toEqual([1])
  }
})

test('custom tokens split across a CRLF keep the newline outside line wrappers', () => {
  const tokens: Token[] = [
    { type: 'comment', value: 'one\r', start: 0, end: 4 },
    { type: 'comment', value: '\ntwo', start: 4, end: 8 },
  ]
  const seen: Token[] = []
  const code = apply('one\r\ntwo', '', {
    languages: [{ name: 'plain', rules: [], tokenize: () => tokens }], lines: true,
    className: token => { seen.push(token); return undefined },
  })
  expect(seen).toEqual(tokens)
  expect(code.children[1]).toEqual({ type: 'text', value: '\r\n' })
  const first = code.children[0] as Element
  const second = code.children[2] as Element
  expect((first.children[0] as Element).children).toEqual([{ type: 'text', value: 'one' }])
  expect((second.children[0] as Element).children).toEqual([{ type: 'text', value: 'two' }])
})

test('line selections do not expand large endpoints or materialize absent lines', () => {
  const code = apply('one\ntwo', '{9007199254740990-9007199254740991}')
  expect(code.children).toHaveLength(3)
  expect(selected(code)).toEqual([])
})

test('traversal handles deep parent trees without recursive stack growth', () => {
  const code: Element = {
    type: 'element', tagName: 'code', properties: { className: ['language-plain'] },
    children: [{ type: 'text', value: 'original' }],
  }
  let element: Element = { type: 'element', tagName: 'pre', properties: {}, children: [code] }
  const pre = element
  for (let index = 0; index < 20_000; index++) element = { type: 'element', tagName: 'div', properties: {}, children: [element] }
  rehypeKirari({ languages: [plain] })({ type: 'root', children: [element] })
  expect(pre.properties.className).toEqual(['kirari'])
  expect(code.children).toEqual([{ type: 'text', value: 'original' }])
})
