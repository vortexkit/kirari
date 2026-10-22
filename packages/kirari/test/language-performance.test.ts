import { expect, test } from 'bun:test'
import { tokenize } from '../src/core.js'
import { swift } from '../src/languages/swift.js'
import { csharp } from '../src/languages/csharp.js'
import { php } from '../src/languages/php.js'
import { css } from '../src/languages/css.js'
import { javascript } from '../src/languages/javascript.js'
import { python } from '../src/languages/python.js'
import { resumableScanOf } from '../src/resumable.js'
import { jsx } from '../src/languages/jsx.js'
import { makefile } from '../src/languages/makefile.js'
import { toml } from '../src/languages/toml.js'
import { yaml } from '../src/languages/yaml.js'
import { createMarkdown } from '../src/markdown.js'
import { createRegistry } from '../src/registry.js'

test('Python checkpoints avoid copying growing delimiter stacks on incomplete input', () => {
  const source = '(\n'.repeat(75_000) + 'value'
  let checkpoints = 0
  const start = performance.now()
  const tokens = resumableScanOf(python)!(source, python, undefined, () => checkpoints++)
  expect(tokens.map(token => token.value).join('')).toBe(source)
  expect(checkpoints).toBe(75_000)
  expect(performance.now() - start).toBeLessThan(1500)
}, 10_000)

test('JSX expression lookups do not repeatedly search the full source for absent line separators', () => {
  const source = '<div>' + '{x}\n'.repeat(64_000) + '</div>'
  const start = performance.now()
  expect(tokenize(source, jsx).map(token => token.value).join('')).toBe(source)
  // Leave room for shared CI runners while catching repeated whole-source searches.
  expect(performance.now() - start).toBeLessThan(5000)
}, 10_000)

test('JSX division lookups share the last-line search across expression scanners', () => {
  const source = '<div>' + '{x / 2}\n'.repeat(16_000) + 'a'.repeat(256_000) + '</div>'
  const start = performance.now()
  expect(tokenize(source, jsx).map(token => token.value).join('')).toBe(source)
  expect(performance.now() - start).toBeLessThan(5000)
}, 10_000)

test('unfinished raw string prefixes do not repeatedly scan the entire prefix run', () => {
  const start = performance.now()
  for (const [language, prefix] of [[swift, '#'], [csharp, '$'], [php, '$']] as const) {
    const source = prefix.repeat(50_000)
    expect(tokenize(source, language).map(t => t.value).join('')).toBe(source)
  }
  expect(performance.now() - start).toBeLessThan(1500)
}, 5000)

test('C# checks closing raw-string quote runs without overlapping comparisons', () => {
  const source = '"'.repeat(80_000) + 'a' + '"'.repeat(79_999) + 'b'.repeat(80_000)
  const start = performance.now()
  expect(tokenize(source, csharp)).toEqual([{ type: 'string', value: source, start: 0, end: source.length }])
  expect(performance.now() - start).toBeLessThan(1000)
}, 5000)

test('short tokens inside long name runs do not rescan the run for lookahead rules', () => {
  const markdown = createMarkdown(createRegistry([javascript]))
  const start = performance.now()
  for (const [language, unit] of [[css, '-0'], [makefile, '|'], [toml, '-0'], [yaml, '0#'], [markdown, '`']] as const) {
    const source = unit.repeat(40_000 / unit.length)
    expect(tokenize(source, language).map(t => t.value).join('')).toBe(source)
  }
  expect(performance.now() - start).toBeLessThan(1500)
}, 5000)
