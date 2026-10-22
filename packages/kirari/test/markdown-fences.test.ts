import { expect, test } from 'bun:test'
import { render, tokenize } from '../src/core.js'
import { createMarkdown } from '../src/markdown.js'
import { createRegistry } from '../src/registry.js'
import { javascript } from '../src/languages/javascript.js'
import { python } from '../src/languages/python.js'
import { json } from '../src/languages/json.js'
import { markdown } from '../src/languages/markdown.js'
import type { Language } from '../src/types.js'

const enhanced = createMarkdown(createRegistry([javascript, python, json, markdown]))
const pairs = (source: string, language = enhanced) => tokenize(source, language).map(token => [token.type, token.value])

test('highlights multilingual fences using the first info word and keeps Markdown outside', () => {
  const source = '# Examples\n```js title="demo"\nconst answer = 42\n```\n~~~PY\ndef greet():\n  return True\n~~~\n```data.json\n{"ready": true}\n```\nText **bold** and `code`.\n'
  const result = pairs(source)
  for (const pair of [['heading', '# Examples'], ['text', '\n'], ['string', '```js title="demo"\n'], ['keyword', 'const'],
    ['keyword', 'def'], ['boolean', 'True'], ['property', '"ready"'], ['boolean', 'true'], ['string', '`code`']]) {
    expect(result).toContainEqual(pair)
  }
  expect(result).toContainEqual(['string', '```\n'])
  expect(result).toContainEqual(['string', '~~~\n'])
})

test('unknown and unlabelled fences and inline code keep the default tokens', () => {
  for (const source of ['```unknown\nconst x = 1\n```\n', '```\nconst x = 1\n```', '~~~ jsx\nconst x = 1\n~~~',
    'Before ```js``` and `const x = 1`.', '    ```js\nconst x = 1\n    ```', '```js`bad\nconst x = 1\n```']) {
    expect(tokenize(source, enhanced)).toEqual(tokenize(source, markdown))
  }
})

test.each([
  '   ````js\r\nconst answer = 42\r\n```\r\n~~~\r\n   ````` \t\r\n# After\r\n',
  '~~~js\nconst answer = 42\n```\n~~\n~~~~\n# After\n',
  '```js\nconst answer = 42\n``` trailing\n```\n# After\n',
])('reuses Markdown fence indentation, character, length, and trailing-text boundaries', source => {
  expect(pairs(source)).toContainEqual(['keyword', 'const'])
  expect(pairs(source).slice(-2)).toEqual([['heading', '# After'], ['text', source.includes('\r\n') ? '\r\n' : '\n']])
  expect(tokenize(source, enhanced).map(token => token.value).join('')).toBe(source)
})

test('unclosed fences highlight the available body and empty bodies emit no empty tokens', () => {
  expect(pairs('```js\nconst answer = "unfinished')).toContainEqual(['keyword', 'const'])
  expect(pairs('```js\n```')).toEqual([['string', '```js\n'], ['string', '```']])
  expect(pairs('```js\n')).toEqual([['string', '```js\n']])
  expect(pairs('```js')).toEqual([['string', '```js']])
})

test('preserves source and global UTF-16 offsets for every incomplete prefix', () => {
  const source = '🙂 # title\r\n```js\r\nconst café = "𐐀<&>";\r\n```\r\n~~~py\nreturn True\n~~~\n```json\r{"x": 1}\r```'
  for (let length = 0; length <= source.length; length++) {
    const prefix = source.slice(0, length)
    const tokens = tokenize(prefix, enhanced)
    expect(tokens.map(token => token.value).join('')).toBe(prefix)
    let offset = 0
    for (const token of tokens) {
      expect(token.start).toBe(offset)
      expect(token.end).toBeGreaterThan(offset)
      expect(token.value).toBe(prefix.slice(token.start, token.end))
      offset = token.end
    }
    expect(offset).toBe(prefix.length)
    expect(tokenize(prefix, enhanced)).toEqual(tokens)
  }
})

test('renders escaped source and retains caller-provided outer Markdown rules', () => {
  const custom: Language = { ...enhanced, rules: [{ type: 'keyword', pattern: /CUSTOM/ }, ...enhanced.rules] }
  const source = 'CUSTOM\n```js\nconst html = "<script>&"\n```\n```unknown\n<img src=x>\n```'
  expect(pairs(source, custom)).toContainEqual(['keyword', 'CUSTOM'])
  const html = render(tokenize(source, custom))
  expect(html).toContain('&lt;script&gt;&amp;')
  expect(html).toContain('&lt;img src=x&gt;')
  expect(html).not.toContain('<script>')
  expect(html).not.toContain('<img')
})

test('does not recursively inject languages into Markdown fences', () => {
  const nested = createMarkdown(createRegistry([enhanced, javascript]))
  const source = '````md\n# Inside\n```js\nconst x = 1\n```\n````\n'
  expect(pairs(source, nested)).toContainEqual(['heading', '# Inside'])
  expect(pairs(source, nested)).toContainEqual(['string', '```js\nconst x = 1\n```\n'])
  expect(pairs(source, nested)).not.toContainEqual(['keyword', 'const'])
})
