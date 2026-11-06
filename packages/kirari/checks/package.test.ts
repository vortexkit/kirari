import { expect, test } from 'bun:test'
import { highlight } from 'kirari'
import { tokenize, render } from 'kirari/core'
import { python } from 'kirari/languages/python'
import { languages } from '../test/fixtures/all-languages.js'
import { createTokenStream } from 'kirari/stream'
import { renderDecorated } from 'kirari/decorations'
import { createRegistry } from 'kirari/registry'
import { createMarkdown } from 'kirari/markdown'
import { javascript } from 'kirari/languages/javascript'
import * as sharedLanguages from 'kirari/languages'

test('optional entrypoints work through public package exports', () => {
  const stream = createTokenStream(javascript)
  expect(stream.mode).toBe('checkpoint')
  const patch = stream.end('const n = 1')
  expect(patch.tokens).toEqual(tokenize('const n = 1', languages.javascript))
  expect(renderDecorated(patch.tokens, { lines: true,
    decorations: [{ start: 6, end: 7, className: 'selected' }],
  })).toContain('kirari-variable selected')
  const registry = createRegistry([languages.javascript])
  expect(registry.resolve('example.js')).toBe(languages.javascript)
  expect(registry.resolve('example.tsx')).toBeUndefined()
  expect(tokenize('```js\nconst n = 1\n```', createMarkdown(registry)))
    .toContainEqual({ type: 'variable', value: 'n', start: 12, end: 13 })
})

test('built ESM exports run in Bun', () => {
  expect(highlight('const answer = 42')).toContain('kirari-variable')
  expect(render(tokenize('print(answer)', python))).toContain('kirari-function')
})

test('every opt-in language resolves through package exports', async () => {
  expect(Object.keys(sharedLanguages).sort()).toEqual(Object.keys(languages).sort())
  for (const name of Object.keys(languages)) {
    const module = await import(`kirari/languages/${name}`)
    // biome-ignore lint/performance/noDynamicNamespaceImportAccess: This export-coverage test intentionally checks every language in the namespace.
    expect(sharedLanguages[name as keyof typeof sharedLanguages]).toBe(module[name])
    expect(module[name].name).toBe(name)
    expect(tokenize('🙂\r\n<&>', module[name]).map(token => token.value).join('')).toBe('🙂\r\n<&>')
  }
})

test('a named language import tree-shakes to the same bundle as its direct path', async () => {
  const entry = new URL('../.checks/language-import.ts', import.meta.url)
  const bundles: string[] = []
  for (const path of ['languages', 'languages/javascript']) {
    await Bun.write(entry, `export { javascript } from 'kirari/${path}'`)
    const result = Bun.spawnSync(['bun', 'build', entry.pathname, '--target=browser', '--minify-whitespace', '--minify-syntax'])
    expect(result.exitCode).toBe(0)
    bundles.push(result.stdout.toString())
  }
  expect(bundles[0]).toContain('javascript')
  expect(bundles[0]).toBe(bundles[1])
})

test('Node runs the built package with no document or Bun global', () => {
  const result = Bun.spawnSync(['node', '--input-type=module', '-e', `
    import assert from 'node:assert/strict';
    import { highlight } from 'kirari';
    import { tokenize } from 'kirari/core';
    import { javascript } from 'kirari/languages/javascript';
    import { createTokenStream } from 'kirari/stream';
    import { renderDecorated } from 'kirari/decorations';
    import { createRegistry } from 'kirari/registry';
    import { createMarkdown } from 'kirari/markdown';
    assert.equal(typeof document, 'undefined');
    assert.equal(typeof Bun, 'undefined');
    assert.match(highlight('const count = 1'), /kirari-variable/);
    const patch = createTokenStream(javascript).end('const n = 1');
    assert.deepEqual(patch.tokens, tokenize('const n = 1', javascript));
    assert.match(renderDecorated(patch.tokens, { lines: true }), /data-line="1"/);
    const registry = createRegistry([javascript]);
    assert.equal(registry.resolve('file.js'), javascript);
    assert.ok(tokenize('\x60\x60\x60js\\nconst n = 1\\n\x60\x60\x60', createMarkdown(registry)).some(t => t.type === 'keyword'));
    const tokens = tokenize('🙂!', {
      name: 'unicode',
      rules: [{ type: 'high', pattern: /[\\uD800-\\uDBFF]/ }, { type: 'char', pattern: /./u }]
    });
    assert.deepEqual(tokens.map(t => [t.start, t.end]), [[0, 1], [1, 2], [2, 3]]);
    assert.equal(tokens.map(t => t.value).join(''), '🙂!');
    for (const name of ${JSON.stringify(Object.keys(languages))}) {
      const module = await import('kirari/languages/' + name);
      const source = '🙂\\r\\n<div>{value}</div> /* unfinished';
      assert.equal(tokenize(source, module[name]).map(t => t.value).join(''), source);
    }
  `], { cwd: new URL('..', import.meta.url).pathname })
  expect(result.stderr.toString()).toBe('')
  expect(result.exitCode).toBe(0)
})

test('TypeScript resolves public declarations through package exports', () => {
  const result = Bun.spawnSync([
    'bun', 'x', '--no-install', 'tsc', '--noEmit', '--strict', '--skipLibCheck',
    '--ignoreConfig', '--target', 'ES2022', '--module', 'NodeNext', './checks/consumer.ts',
  ], { cwd: new URL('..', import.meta.url).pathname })
  expect(result.stdout.toString() + result.stderr.toString()).toBe('')
  expect(result.exitCode).toBe(0)
})
