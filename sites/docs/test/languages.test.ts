import { expect, test } from 'bun:test'
import { readdirSync } from 'node:fs'
import { highlight, tokenize } from 'kirari'
import { languageEntries } from '@/lib/languages.js'

test('the playground covers every public language exactly once', () => {
  const modules = readdirSync(new URL('../../../packages/kirari/src/languages', import.meta.url))
    .filter(file => file.endsWith('.ts'))
    .map(file => file.slice(0, -3))
  expect(languageEntries.map(entry => entry.id).sort()).toEqual(modules.sort())
  expect(languageEntries).toHaveLength(48)
})

for (const entry of languageEntries) {
  test(`${entry.label} has a short sample that roundtrips and renders escaped HTML`, () => {
    expect(entry.label.length).toBeGreaterThan(0)
    expect(entry.filename.length).toBeGreaterThan(0)
    expect(entry.sample.split('\n').length).toBeGreaterThanOrEqual(4)
    expect(entry.sample.split('\n').length).toBeLessThanOrEqual(9)
    expect(tokenize(entry.sample, entry.language).map(token => token.value).join('')).toBe(entry.sample)

    for (const source of [entry.sample, `${entry.sample}\n<img src=x onerror="alert('test')">&`]) {
      const rendered = highlight(source, { language: entry.language })
      const escaped = source.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;')
        .replaceAll('"', '&quot;').replaceAll("'", '&#39;')
      expect(rendered.replace(/<span class="kirari-[a-z]+">|<\/span>/g, '')).toBe(escaped)
    }
  })
}
