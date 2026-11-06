import { expect, test } from 'bun:test'
import rehypeKirari from 'kirari-rehype'
import { javascript } from 'kirari/languages/javascript'
import { unified } from 'unified'
import type { Root } from 'hast'

test('built ESM package works in Bun through public exports', async () => {
  const tree: Root = {
    type: 'root', children: [{ type: 'element', tagName: 'pre', properties: {}, children: [{
      type: 'element', tagName: 'code', properties: { className: ['language-js'] },
      children: [{ type: 'text', value: 'const answer = 42' }],
    }] }],
  }
  await unified().use(rehypeKirari, { languages: [javascript] }).run(tree)
  expect(JSON.stringify(tree)).toContain('kirari-keyword')
})

test('Node runs built ESM without Bun or DOM globals', () => {
  const result = Bun.spawnSync(['node', '--input-type=module', '-e', `
    import assert from 'node:assert/strict';
    import rehypeKirari from 'kirari-rehype';
    import { javascript } from 'kirari/languages/javascript';
    import { unified } from 'unified';
    import remarkParse from 'remark-parse';
    import remarkRehype from 'remark-rehype';
    import rehypeStringify from 'rehype-stringify';
    assert.equal(typeof document, 'undefined');
    assert.equal(typeof Bun, 'undefined');
    const processor = unified().use(remarkParse).use(remarkRehype)
      .use(rehypeKirari, { languages: [javascript], lines: true }).use(rehypeStringify);
    const html = String(await processor.process('\x60\x60\x60js\\nconst answer = 42\\n\x60\x60\x60'));
    assert.match(html, /kirari-keyword/);
    assert.match(html, /data-line="1"/);
  `], { cwd: new URL('..', import.meta.url).pathname })
  expect(result.stderr.toString()).toBe('')
  expect(result.exitCode).toBe(0)
})

test('TypeScript resolves exported plugin declarations with unified', () => {
  const result = Bun.spawnSync([
    'bun', 'x', '--no-install', 'tsc', '--noEmit', '--strict', '--skipLibCheck',
    '--ignoreConfig', '--target', 'ES2022', '--module', 'NodeNext', './checks/consumer.ts',
  ], { cwd: new URL('..', import.meta.url).pathname })
  expect(result.stdout.toString() + result.stderr.toString()).toBe('')
  expect(result.exitCode).toBe(0)
})
