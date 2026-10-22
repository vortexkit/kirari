import { expect, test } from 'bun:test'
import { tokenize } from '../src/core.js'
import { css } from '../src/languages/css.js'
import { markdown } from '../src/languages/markdown.js'
import { yaml } from '../src/languages/yaml.js'
import { sql } from '../src/languages/sql.js'
import { toml } from '../src/languages/toml.js'
import { dockerfile } from '../src/languages/dockerfile.js'
import type { Language } from '../src/types.js'

const pairs = (source: string, language: Language) => tokenize(source, language)
  .filter(token => token.type !== 'text').map(token => [token.type, token.value])

test('CSS selectors, custom properties, dimensions, colors, and functions', () => {
  const result = pairs('@media (width > 40rem) { .card:hover { --gap: 1.5rem; color: #aabbcc; padding: var(--gap); } }', css)
  for (const pair of [['keyword', '@media'], ['type', '.card'], ['type', ':hover'],
    ['variable', '--gap'], ['number', '1.5rem'], ['property', 'color'],
    ['number', '#aabbcc'], ['function', 'var']]) expect(result).toContainEqual(pair)
  expect(pairs('/* } */ "a\\"b"', css)).toEqual([['comment', '/* } */'], ['string', '"a\\"b"']])
})

test('Markdown headings, links, inline code, and fence length', () => {
  const source = '# Heading\r\nText **bold** and [site](https://example.com), ``a ` b``.\n~~~~ js\n# code\n~~~\n~~~~\nAfter\n'
  const result = pairs(source, markdown)
  expect(result).toContainEqual(['heading', '# Heading'])
  expect(result).toContainEqual(['string', '[site](https://example.com)'])
  expect(result).toContainEqual(['string', '``a ` b``'])
  expect(result).toContainEqual(['string', '~~~~ js\n# code\n~~~\n~~~~\n'])
  expect(pairs('Title\n=====\n', markdown)).toEqual([['heading', 'Title'], ['heading', '=====']])
  expect(tokenize('# Title\nnext', markdown).map(token => [token.type, token.value])).toEqual([['heading', '# Title'], ['text', '\n'], ['text', 'next']])
  expect(tokenize('Title\r\n---\r\n', markdown).map(token => [token.type, token.value])).toEqual([['heading', 'Title'], ['text', '\r\n'], ['heading', '---'], ['text', '\r\n']])
  expect(pairs('```js\nunfinished', markdown)).toEqual([['string', '```js\nunfinished']])
})

test('YAML mappings, sequences, anchors, and scalar values', () => {
  const result = pairs('---\nbase: &base\n  enabled: true\n  count: 12\n  missing: null\nitems:\n  - *base\n  - "quoted"\nurl: https://example.com/#part # comment\n', yaml)
  for (const pair of [['keyword', '---'], ['property', 'base'], ['variable', '&base'],
    ['boolean', 'true'], ['number', '12'], ['null', 'null'], ['variable', '*base'],
    ['string', '"quoted"'], ['comment', '# comment']]) expect(result).toContainEqual(pair)
})

test('YAML scalars only end before a comment that follows whitespace', () => {
  expect(pairs('a: 3#x\nb: ~#y\nc: true # z\n', yaml)).toEqual([
    ['property', 'a'], ['punctuation', ':'], ['string', '3#x'],
    ['property', 'b'], ['punctuation', ':'], ['string', '~#y'],
    ['property', 'c'], ['punctuation', ':'], ['boolean', 'true'], ['comment', '# z'],
  ])
})

test('YAML block scalars stop at inferred and explicit indentation', () => {
  const result = pairs('script: |-\n\n  echo true\n  # literal\nnext: false\n- text: >2\n    literal: true\n  after: 3\n', yaml)
  expect(result).toContainEqual(['string', '  echo true\n'])
  expect(result).toContainEqual(['string', '  # literal\n'])
  expect(result).toContainEqual(['property', 'next'])
  expect(result).toContainEqual(['boolean', 'false'])
  expect(result).toContainEqual(['string', '    literal: true\n'])
  expect(result).toContainEqual(['property', 'after'])
  expect(result).toContainEqual(['number', '3'])
})

test('SQL case-insensitive keywords, quoted identifiers, escaped strings, and comments', () => {
  const result = pairs('sElEcT "name", count(*), \'it\'\'s fine\' FROM [users] WHERE active = TRUE AND id = $1; -- note\n/* done */', sql)
  for (const pair of [['keyword', 'sElEcT'], ['property', '"name"'], ['function', 'count'],
    ['string', "'it''s fine'"], ['property', '[users]'], ['boolean', 'TRUE'],
    ['variable', '$1'], ['comment', '-- note'], ['comment', '/* done */']]) expect(result).toContainEqual(pair)
})

test('TOML sections, dotted keys, dates, inline tables, and multiline strings', () => {
  const result = pairs('[package]\nname = "demo"\nowner.name = \'Ada\'\ncreated = 1979-05-27T07:32:00Z\nenabled = true\ninfo = { count = 2 }\ntext = """hello\nworld"""\n[[products]]\n', toml)
  for (const pair of [['heading', '[package]'], ['heading', '[[products]]'], ['property', 'owner'],
    ['property', 'name'], ['number', '1979-05-27T07:32:00Z'], ['boolean', 'true'],
    ['property', 'count'], ['string', '"""hello\nworld"""']]) expect(result).toContainEqual(pair)
})

test('Dockerfile directives, build arguments, variables, JSON form, and continuations', () => {
  const result = pairs('# syntax=docker/dockerfile:1\nfrom node:22 AS build\nARG APP=/app\nWORKDIR ${APP}\nRUN echo $APP \\\r\n  && echo done\nCOPY --from=build /app /app\nCMD ["node", "app.js"]\n', dockerfile)
  for (const pair of [['comment', '# syntax=docker/dockerfile:1'], ['keyword', 'from'],
    ['keyword', 'AS'], ['variable', 'APP'], ['variable', '${APP}'], ['variable', '$APP'],
    ['operator', '\\\r\n'], ['property', '--from'], ['string', '"app.js"']]) expect(result).toContainEqual(pair)
})

for (const language of [css, markdown, yaml, sql, toml, dockerfile]) {
  test(`${language.name} preserves Unicode, CRLF, and incomplete input`, () => {
    for (const source of ['', '🙂 café\r\n𐐀', '"unterminated\\', "'unterminated", '/* unfinished',
      '```\n# unfinished\n', 'key: |2\r\n  🙂\r\nnext: true', '[unfinished', '"""unfinished']) {
      const tokens = tokenize(source, language)
      expect(tokens.map(token => token.value).join('')).toBe(source)
      let offset = 0
      for (const token of tokens) {
        expect(token.start).toBe(offset)
        expect(token.end).toBeGreaterThan(offset)
        expect(token.value).toBe(source.slice(token.start, token.end))
        offset = token.end
      }
      expect(offset).toBe(source.length)
    }
  })
  test(`${language.name} consumes long malformed delimiters without repeated rescans`, () => {
    const source = ('"' + '\\"'.repeat(5_000) + '\\\r\n') + ('`['.repeat(5_000))
    expect(tokenize(source, language).map(token => token.value).join('')).toBe(source)
  }, 2_000)
}

test('format callbacks apply caller-provided inline rules', () => {
  for (const language of [css, markdown, yaml]) {
    const custom: Language = { ...language, rules: [{ type: 'keyword', pattern: /CUSTOM/ }, ...language.rules] }
    expect(pairs('CUSTOM', custom)).toEqual([['keyword', 'CUSTOM']])
  }
})

test('Markdown handles long unmatched brackets without rescanning the suffix', () => {
  const source = '['.repeat(40_000)
  expect(tokenize(source, markdown).map(token => token.value).join('')).toBe(source)
}, 2_000)

test('CSS and TOML consume dangling escapes in unfinished strings', () => {
  expect(pairs('"unfinished\\', css)).toEqual([['string', '"unfinished\\']])
  expect(pairs('"""unfinished\n\\', toml)).toEqual([['string', '"""unfinished\n\\']])
})

test('CSS separates selector context from declaration values and nested at-rules', () => {
  const result = pairs('a:hover, #abc { color:red; background:#abc; @media (width > 30rem) { button:focus { color:rgb(1 2 3); } } }', css)
  for (const pair of [['type', 'a'], ['type', ':hover'], ['type', '#abc'], ['property', 'color'],
    ['property', 'background'], ['number', '#abc'], ['type', 'button'], ['type', ':focus'], ['function', 'rgb']]) expect(result).toContainEqual(pair)
  expect(result).not.toContainEqual(['property', 'a'])
  expect(result).not.toContainEqual(['type', ':red'])
})

test('CSS custom property values retain nested braces, functions, and fallback colors', () => {
  const result = pairs(':root { --palette: { accent: #abc; nested: { color: red; } }; --gap: calc(1rem + 2px); color:var(--accent, #fff); } #def { color: blue; }', css)
  for (const pair of [['type', ':root'], ['variable', '--palette'], ['number', '#abc'],
    ['variable', '--gap'], ['function', 'calc'], ['function', 'var'], ['variable', '--accent'],
    ['number', '#fff'], ['type', '#def']]) expect(result).toContainEqual(pair)
})
