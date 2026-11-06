import { expect, test } from 'bun:test'
import type { Element, Root, RootContent } from 'hast'
import { unified } from 'unified'
import remarkParse from 'remark-parse'
import remarkRehype from 'remark-rehype'
import rehypeStringify from 'rehype-stringify'
import rehypeSanitize from 'rehype-sanitize'
import { compile, run } from '@mdx-js/mdx'
import { createElement } from 'react'
import * as runtime from 'react/jsx-runtime'
import { renderToStaticMarkup } from 'react-dom/server'
import { tokenize, type Language, type Token } from 'kirari/core'
import { javascript } from 'kirari/languages/javascript'
import { tsx } from 'kirari/languages/tsx'
import rehypeKirari, { type Options } from '../src/index.js'

const block = (source: string, label?: string, meta?: string): Root => {
  const code: Element = {
    type: 'element', tagName: 'code',
    properties: label ? { className: [`language-${label}`] } : {},
    children: [{ type: 'text', value: source }],
  }
  if (meta !== undefined) code.data = { meta } as Element['data']
  return { type: 'root', children: [{ type: 'element', tagName: 'pre', properties: {}, children: [code] }] }
}

const elements = (tree: Root | RootContent, name: string): Element[] => {
  const found: Element[] = tree.type === 'element' && tree.tagName === name ? [tree] : []
  if ('children' in tree) for (const child of tree.children) found.push(...elements(child, name))
  return found
}

const sourceText = (tree: Root | RootContent): string => {
  if (tree.type === 'text') return tree.value
  return 'children' in tree ? tree.children.map(sourceText).join('') : ''
}

const classes = (node: Element): string[] => {
  const value = node.properties.className
  return Array.isArray(value) ? value.map(String) : []
}

const transform = async (tree: Root, options: Options = {}): Promise<Root> => {
  await unified().use(rehypeKirari, options).run(tree)
  return tree
}

const markdown = (options: Options) => {
  return unified().use(remarkParse).use(remarkRehype).use(rehypeKirari, options).use(rehypeStringify)
}

test('requires explicit languages and leaves unknown, unlabelled, and unregistered dialects unchanged', async () => {
  for (const [label, options] of [
    ['js', {}], ['unknown', { languages: [javascript] }],
    [undefined, { languages: [javascript] }], ['tsx', { languages: [javascript] }],
  ] as const) {
    const tree = block('const answer = 42\n', label)
    const before = structuredClone(tree)
    await transform(tree, options)
    expect(tree).toEqual(before)
  }
})

test('resolves registered aliases and highlights distinct registered TSX', async () => {
  const js = await transform(block('const answer = 42\n', 'js'), { languages: [javascript] })
  expect(elements(js, 'span').some(node => classes(node).includes('kirari-keyword'))).toBe(true)
  expect(classes(elements(js, 'pre')[0]!)).toEqual(['kirari'])
  const component = await transform(block('<Card count={2} />\n', 'tsx'), { languages: [tsx] })
  expect(elements(component, 'span').some(node => classes(node).includes('kirari-tag'))).toBe(true)
  expect(sourceText(component)).toBe('<Card count={2} />\n')
})

test('preserves existing properties and original source while adding only HAST elements and text', async () => {
  const source = 'const payload = "<img src=x onerror=alert(1)> & \\"🙂\\""\r\n'
  const tree = block(source, 'js')
  const pre = elements(tree, 'pre')[0]!
  const code = elements(tree, 'code')[0]!
  pre.properties = { className: ['example'], id: 'snippet', tabIndex: 0 }
  code.properties = { ...code.properties, dataSource: 'agent', ariaLabel: 'Original source' }
  await transform(tree, { languages: [javascript] })
  expect(pre.properties).toEqual({ className: ['example', 'kirari'], id: 'snippet', tabIndex: 0 })
  expect(code.properties).toEqual({ className: ['language-js'], dataSource: 'agent', ariaLabel: 'Original source' })
  expect(sourceText(tree)).toBe(source)
  for (const node of elements(tree, 'span')) expect(node.children.every(child => child.type === 'text')).toBe(true)
  const html = unified().use(rehypeStringify).stringify(tree)
  expect(html).not.toContain('<img')
  expect(html).toContain('&#x3C;img')
})

test('inline code, nested code, non-text code, and no-highlight flags are left alone', async () => {
  const candidates: Root[] = []
  const inline = block('const value = 1', 'js')
  inline.children = elements(inline, 'code')
  candidates.push(inline)
  const nested = block('const value = 1', 'js')
  const pre = elements(nested, 'pre')[0]!
  pre.children = [{ type: 'element', tagName: 'div', properties: {}, children: pre.children }]
  candidates.push(nested)
  const highlighted = block('const value = 1', 'js')
  elements(highlighted, 'code')[0]!.children = [{ type: 'element', tagName: 'span', properties: {}, children: [{ type: 'text', value: 'const value = 1' }] }]
  candidates.push(highlighted)
  for (const flag of ['no-highlight', 'nohighlight']) {
    for (const target of ['pre', 'code']) {
      const tree = block('const value = 1', 'js')
      const node = elements(tree, target)[0]!
      node.properties.className = [...classes(node), flag]
      candidates.push(tree)
    }
  }
  for (const tree of candidates) {
    const before = structuredClone(tree)
    await transform(tree, { languages: [javascript] })
    expect(tree).toEqual(before)
  }
})

test('keeps raw HTML nodes opaque', async () => {
  const tree = block('const value = 1', 'js')
  elements(tree, 'code')[0]!.children = [{ type: 'raw', value: '<b>unsafe</b>' } as unknown as Element['children'][number]]
  const before = structuredClone(tree)
  await transform(tree, { languages: [javascript] })
  expect(tree).toEqual(before)
})

test('evaluates class callbacks once for original tokens even when tokens span multiple lines', async () => {
  const source = '/* first\r\nsecond */\nconst count = 1\n'
  const seen: Token[] = []
  const tree = await transform(block(source, 'js'), {
    languages: [javascript], lines: true, classes: { variable: 'identifier' },
    className: token => { seen.push(token); return token.type === 'comment' ? 'annotation' : undefined },
  })
  expect(seen).toEqual(tokenize(source, javascript))
  expect(elements(tree, 'span').filter(node => classes(node).includes('annotation'))).toHaveLength(2)
  expect(elements(tree, 'span').some(node => classes(node).includes('identifier'))).toBe(true)
  expect(sourceText(tree)).toBe(source)
})

test('treats custom class text as data, including quotes and HTML-shaped text', async () => {
  const tree = await transform(block('const answer = 1', 'js'), {
    languages: [javascript], classes: { keyword: 'chosen" onclick="alert(1)' },
    className: () => '<script>unsafe</script>',
  })
  const html = unified().use(rehypeStringify).stringify(tree)
  expect(html).not.toContain(' onclick="')
  expect(html).toContain('chosen&#x22; onclick=&#x22;alert(1)')
  expect(elements(tree, 'script')).toHaveLength(0)
  expect(sourceText(tree)).toBe('const answer = 1')
  expect(elements(tree, 'span').every(node => Object.keys(node.properties).join() === 'className')).toBe(true)
})

test('ignores inherited token mappings', async () => {
  const mapping = Object.create({ keyword: 'inherited' }) as Record<string, string>
  const tree = await transform(block('const value = 1', 'js'), { languages: [javascript], classes: mapping })
  expect(elements(tree, 'span').some(node => classes(node).includes('inherited'))).toBe(false)
})

test('rejects custom tokenizer output that would lose, replace, or overlap source before mutating the block', async () => {
  for (const tokens of [
    [],
    [{ type: 'text', value: 'ab', start: 0, end: 2 }],
    [{ type: 'text', value: 'xyz', start: 0, end: 3 }],
    [{ type: 'text', value: 'abc', start: 1, end: 4 }],
    [{ type: 'text', value: 'ab', start: 0, end: 2 }, { type: 'text', value: 'bc', start: 1, end: 3 }],
  ]) {
    const language: Language = { name: 'custom', rules: [], tokenize: () => tokens }
    const tree = block('abc', 'custom')
    const before = structuredClone(tree)
    await expect(transform(tree, { languages: [language] })).rejects.toThrow()
    expect(tree).toEqual(before)
  }
})

test('line wrappers preserve CRLF, CR, LF, Unicode, and the trailing newline without an extra line', async () => {
  const source = 'const face = "🙂"\r\n\rnext()\n'
  const seen: { number: number; start: number; end: number }[] = []
  const tree = await transform(block(source, 'js'), {
    languages: [javascript], lines: true,
    lineClassName: line => { seen.push(line); return line.number === 2 ? 'empty' : undefined },
  })
  const firstEnd = source.indexOf('\r')
  expect(seen).toEqual([
    { number: 1, start: 0, end: firstEnd },
    { number: 2, start: firstEnd + 2, end: firstEnd + 2 },
    { number: 3, start: firstEnd + 3, end: source.length - 1 },
  ])
  const lines = elements(tree, 'span').filter(node => classes(node).includes('kirari-line'))
  expect(lines).toHaveLength(3)
  expect(lines.map(sourceText)).toEqual(['const face = "🙂"', '', 'next()'])
  expect(classes(lines[1]!)).toContain('empty')
  expect(sourceText(tree)).toBe(source)
  const html = unified().use(rehypeStringify).stringify(tree)
  for (let number = 1; number <= 3; number++) expect(html).toContain(`data-line="${number}"`)
  expect(html).not.toContain('data-line="4"')
  expect(elements(tree, 'code')[0]!.children.filter(node => node.type === 'text').map(node => node.value)).toEqual(['\r\n', '\r', '\n'])
})

test('Markdown fences get one wrapper per written line', async () => {
  const html = String(await markdown({ languages: [javascript], lines: true }).process('```js {2}\nconst a = 1\nconst b = 2\n```'))
  expect(html.match(/data-line="\d+"/g)).toEqual(['data-line="1"', 'data-line="2"'])
  expect(html).toContain('</span></span>\n</code>')
})

test('empty blocks produce a single empty wrapper when lines are enabled', async () => {
  const tree = await transform(block('', 'js'), { languages: [javascript], lines: true })
  const lines = elements(tree, 'span').filter(node => classes(node).includes('kirari-line'))
  expect(lines).toHaveLength(1)
  expect(lines[0]!.children).toEqual([])
})

test('a line callback alone does not enable wrapping', async () => {
  let calls = 0
  const tree = await transform(block('const count = 1\n', 'js'), {
    languages: [javascript], lineClassName: () => { calls++; return 'line' },
  })
  expect(calls).toBe(0)
  expect(elements(tree, 'span').some(node => classes(node).includes('kirari-line'))).toBe(false)
})

test('standalone fence selections enable wrappers and combine with custom line classes', async () => {
  const source = 'one\ntwo\nthree\nfour\nfive\nsix'
  const tree = await transform(block(source, 'js', 'title="example.js" {2,4-6}'), {
    languages: [javascript], lineClassName: line => line.number === 4 ? 'focused' : undefined,
  })
  const lines = elements(tree, 'span').filter(node => classes(node).includes('kirari-line'))
  expect(lines).toHaveLength(6)
  expect(lines.map(node => classes(node).includes('kirari-line-highlighted'))).toEqual([false, true, false, true, true, true])
  expect(classes(lines[3]!)).toContain('focused')
  expect(sourceText(tree)).toBe(source)
})

test('ignores malformed selections and braces inside quoted titles', async () => {
  for (const meta of ['{0}', '{-1}', '{3-1}', '{1,}', '{1.5}', '{x}', 'title="{2}"', "title='{2}'", 'title={2}', '{9007199254740992}']) {
    const tree = await transform(block('one\ntwo\nthree', 'js', meta), { languages: [javascript] })
    expect(elements(tree, 'span').some(node => classes(node).includes('kirari-line-highlighted'))).toBe(false)
    expect(elements(tree, 'span').some(node => classes(node).includes('kirari-line'))).toBe(false)
  }
})

test('large valid ranges are bounded by actual lines', async () => {
  const tree = await transform(block('one\ntwo', 'js', '{1-9007199254740991}'), { languages: [javascript] })
  const lines = elements(tree, 'span').filter(node => classes(node).includes('kirari-line-highlighted'))
  expect(lines).toHaveLength(2)
})

test('processing an already wrapped block preserves the tree without rerunning callbacks', async () => {
  let calls = 0
  const options: Options = { languages: [javascript], lines: true, className: () => { calls++; return undefined } }
  const tree = await transform(block('const value = 1\n', 'js'), options)
  const before = structuredClone(tree)
  const firstCalls = calls
  await transform(tree, options)
  expect(tree).toEqual(before)
  expect(calls).toBe(firstCalls)
})

test('real Markdown pipeline handles fenced blocks nested in lists and blockquotes', async () => {
  const input = [
    '- Example:', '', '  ```js {2}', '  const first = 1', '  const second = 2', '  ```', '',
    '> ```js', '> const quoted = 3', '> ```', '', '`const inline = 4`', '',
    '```unknown', '<img src=x onerror=alert(1)>', '```',
  ].join('\n')
  const processor = markdown({ languages: [javascript] })
  const tree = await processor.run(processor.parse(input))
  expect(elements(tree, 'pre').filter(node => classes(node).includes('kirari'))).toHaveLength(2)
  expect(elements(tree, 'span').filter(node => classes(node).includes('kirari-line-highlighted'))).toHaveLength(1)
  const inline = elements(tree, 'code').find(node => sourceText(node) === 'const inline = 4')!
  expect(inline.children).toEqual([{ type: 'text', value: 'const inline = 4', position: inline.children[0]!.position }])
  const unknown = elements(tree, 'code').find(node => classes(node).includes('language-unknown'))!
  expect(sourceText(unknown)).toBe('<img src=x onerror=alert(1)>\n')
  expect(unknown.children.every(node => node.type === 'text')).toBe(true)
  const html = String(await processor.process(input))
  expect(html).toContain('<blockquote>')
  expect(html).toContain('<ul>')
  expect(html).not.toContain('<img')
})

test('works after sanitization and never turns code source into executable markup', async () => {
  const processor = unified().use(remarkParse).use(remarkRehype).use(rehypeSanitize)
    .use(rehypeKirari, { languages: [javascript], lines: true }).use(rehypeStringify)
  const html = String(await processor.process('```js\nconst html = "<script>alert(1)</script>"\n```'))
  expect(html).toContain('kirari-keyword')
  expect(html).toContain('kirari-line')
  expect(html).not.toContain('<script>')
})

test('MDX compiles and renders structured spans with selected lines', async () => {
  const compiled = await compile([
    '# Original example', '', '<section data-example="nested">', '',
    '```tsx {2}', 'const count = 2;', '<Card count={count} />', '```', '', '</section>',
  ].join('\n'), {
    outputFormat: 'function-body',
    rehypePlugins: [[rehypeKirari, { languages: [tsx] }]],
  })
  const { default: Content } = await run(String(compiled), { ...runtime, baseUrl: import.meta.url })
  const html = renderToStaticMarkup(createElement(Content))
  expect(html).toContain('<h1>Original example</h1>')
  expect(html).toContain('<section data-example="nested">')
  expect(html).toContain('class="kirari"')
  expect(html).toContain('kirari-line-highlighted')
  expect(html).toContain('kirari-tag')
  expect(html).not.toContain('<Card')
})
