import { expect, test } from 'bun:test'
import { readFile } from 'node:fs/promises'
import * as scoped from '@vortexlabs/kirari-rehype'
import * as rehype from 'kirari-rehype'

test('exposes the same entry points as kirari-rehype', async () => {
  const read = async (path: string) => JSON.parse(await readFile(new URL(path, import.meta.url), 'utf8'))
  const [compat, real] = await Promise.all([read('../package.json'), read('../../rehype/package.json')])
  expect(Object.keys(compat.exports).sort()).toEqual(Object.keys(real.exports).sort())
})

test('re-exports the same objects as kirari-rehype, including the default plugin', () => {
  expect(Object.keys(scoped).sort()).toEqual(Object.keys(rehype).sort())
  for (const [key, value] of Object.entries(rehype)) expect(Reflect.get(scoped, key)).toBe(value)
  expect(scoped.default).toBe(rehype.default)
})
