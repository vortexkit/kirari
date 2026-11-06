import { expect, test } from 'bun:test'
import { readdir, readFile } from 'node:fs/promises'
import * as scoped from '@vortexlabs/kirari'
import * as core from 'kirari'
import * as scopedLanguages from '@vortexlabs/kirari/languages'
import * as coreLanguages from 'kirari/languages'

const root = new URL('../', import.meta.url)
const manifest = JSON.parse(await readFile(new URL('package.json', root), 'utf8'))
const kirariManifest = JSON.parse(await readFile(new URL('../kirari/package.json', root), 'utf8'))

test('exposes the same entry points as kirari', () => {
  expect(manifest.exports).toEqual(kirariManifest.exports)
  expect(manifest.sideEffects).toEqual(kirariManifest.sideEffects)
})

test('re-exports the same objects, so both names share one registry and one set of languages', async () => {
  expect(Object.keys(scoped).sort()).toEqual(Object.keys(core).sort())
  for (const key of Object.keys(core)) expect(scoped[key as keyof typeof scoped]).toBe(core[key as keyof typeof core])
  expect(scopedLanguages).toEqual(coreLanguages)
  for (const entry of ['core', 'stream', 'decorations', 'registry', 'markdown']) {
    const [left, right] = await Promise.all([import(`@vortexlabs/kirari/${entry}`), import(`kirari/${entry}`)])
    expect(Object.keys(left).sort()).toEqual(Object.keys(right).sort())
    for (const key of Object.keys(right)) expect(left[key]).toBe(right[key])
  }
})

test('every language subpath resolves to the kirari definition', async () => {
  const names = (await readdir(new URL('../kirari/dist/languages/', root))).filter(name => name.endsWith('.js')).map(name => name.slice(0, -3))
  expect(names.length).toBeGreaterThan(0)
  for (const name of names) {
    const [left, right] = await Promise.all([import(`@vortexlabs/kirari/languages/${name}`), import(`kirari/languages/${name}`)])
    expect(left[name]).toBe(right[name])
  }
})

test('ships the same theme files', async () => {
  const themes = await readdir(new URL('../kirari/themes/', root))
  expect((await readdir(new URL('themes/', root))).sort()).toEqual(themes.sort())
  for (const name of themes) {
    expect(await readFile(new URL(`themes/${name}`, root), 'utf8')).toBe(await readFile(new URL(`../kirari/themes/${name}`, root), 'utf8'))
  }
  expect(await readFile(new URL(import.meta.resolve('@vortexlabs/kirari/theme.css')), 'utf8'))
    .toBe(await readFile(new URL(import.meta.resolve('kirari/theme.css')), 'utf8'))
})
