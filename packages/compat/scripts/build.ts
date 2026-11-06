import { cp, mkdir, readdir, rm, writeFile } from 'node:fs/promises'
import { createRequire } from 'node:module'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = fileURLToPath(new URL('..', import.meta.url))
const kirari = dirname(createRequire(join(root, 'package.json')).resolve('kirari/package.json'))
const dist = join(root, 'dist')

const reexport = async (file: string, specifier: string) => {
  const source = `export * from '${specifier}'\n`
  await writeFile(join(dist, `${file}.js`), source)
  await writeFile(join(dist, `${file}.d.ts`), source)
}

await rm(dist, { recursive: true, force: true })
await rm(join(root, 'themes'), { recursive: true, force: true })
await mkdir(join(dist, 'languages'), { recursive: true })

await reexport('index', 'kirari')
for (const entry of ['core', 'stream', 'decorations', 'registry', 'markdown', 'languages']) {
  await reexport(entry, `kirari/${entry}`)
}
const languages = (await readdir(join(kirari, 'dist/languages')).catch(() => [])).filter(name => name.endsWith('.js'))
if (!languages.length) throw new Error('Build kirari before @vortexlabs/kirari: no languages found in kirari/dist.')
for (const name of languages) {
  await reexport(`languages/${name.slice(0, -3)}`, `kirari/languages/${name.slice(0, -3)}`)
}

await cp(join(kirari, 'themes'), join(root, 'themes'), { recursive: true })
console.log(`@vortexlabs/kirari: re-exported ${languages.length} languages and copied themes from kirari.`)
