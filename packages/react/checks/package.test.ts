import { expect, test } from 'bun:test'

const dist = new URL('../dist/', import.meta.url)

test('Node renders the built component without Bun or DOM globals', () => {
  const result = Bun.spawnSync(['node', '--input-type=module', '-e', `
    import assert from 'node:assert/strict';
    import { createElement } from 'react';
    import { renderToStaticMarkup } from 'react-dom/server';
    import { Code } from 'kirari-react';
    import { applyPatch } from 'kirari-react/stream';
    import { python } from 'kirari/languages/python';
    assert.equal(typeof document, 'undefined');
    assert.equal(typeof Bun, 'undefined');
    const html = renderToStaticMarkup(createElement(Code, { language: python, lines: true }, 'print(1)'));
    assert.match(html, /^<pre class="kirari"><code><span class="kirari-line" data-line="1">/);
    assert.match(html, /kirari-function/);
    assert.equal(typeof applyPatch, 'function');
  `], { cwd: new URL('..', import.meta.url).pathname })
  expect(result.stderr.toString()).toBe('')
  expect(result.exitCode).toBe(0)
})

test('the component entry stays hook-free for Server Components', async () => {
  const code = await Bun.file(new URL('index.js', dist)).text()
  expect(code).not.toMatch(/use client|useState|useMemo|useCallback|useEffect/)
})

test('the stream entry is marked as a client module', async () => {
  const code = await Bun.file(new URL('stream.js', dist)).text()
  expect(code.startsWith("'use client';")).toBe(true)
})
