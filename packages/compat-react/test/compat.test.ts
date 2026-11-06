import { expect, test } from 'bun:test'
import { readFile } from 'node:fs/promises'
import * as scoped from '@vortexlabs/kirari-react'
import * as scopedStream from '@vortexlabs/kirari-react/stream'
import * as react from 'kirari-react'
import * as reactStream from 'kirari-react/stream'

const read = async (path: string) => JSON.parse(await readFile(new URL(path, import.meta.url), 'utf8'))

test('exposes the same entry points as kirari-react', async () => {
  const [compat, real] = await Promise.all([read('../package.json'), read('../../react/package.json')])
  expect(Object.keys(compat.exports)).toEqual(Object.keys(real.exports))
  expect(compat.peerDependencies).toEqual(Object.fromEntries(Object.entries(real.peerDependencies).filter(([name]) => name !== 'kirari')))
})

test('re-exports the same objects as kirari-react', () => {
  for (const [left, right] of [[scoped, react], [scopedStream, reactStream]] as const) {
    expect(Object.keys(left).sort()).toEqual(Object.keys(right).sort())
    for (const key of Object.keys(right)) expect(left[key as keyof typeof left]).toBe(right[key as keyof typeof right])
  }
})
