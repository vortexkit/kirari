import { expect, test } from 'bun:test'
import { tokenize, highlight } from '../src/index.js'
import { jsx } from '../src/languages/jsx.js'
import { tsx } from '../src/languages/tsx.js'
import { html } from '../src/languages/html.js'
import { xml } from '../src/languages/xml.js'
import { createTokenStream } from '../src/stream.js'
import type { Token } from '../src/types.js'

const pairs = (source: string, language = jsx) => tokenize(source, language).map(t => [t.type, t.value])

for (const language of [jsx, tsx]) {
  test(`${language.name} highlights sibling JSX snippets without adding fragments`, () => {
    const source = 'import { Container, Placeholder } from "@vortexlabs/vortex";\n\n'
      + '<Container width="100%" padding={4}>\n  <Placeholder width="100%" backgroundColor="surface" />\n</Container>\n\n'
      + '<Container width="100%">\n  <Placeholder width="100%" backgroundColor="surface" />\n</Container>'
    const tokens = tokenize(source, language)
    expect(tokens.filter(t => t.type === 'tag').map(t => t.value)).toEqual([
      'Container', 'Placeholder', 'Container', 'Container', 'Placeholder', 'Container',
    ])
    expect(tokens.filter(t => t.type === 'attribute' && t.value === 'width')).toHaveLength(4)
    expect(tokens.map(t => t.value).join('')).toBe(source)
    let end = 0
    for (const token of tokens) {
      expect(token.start).toBe(end)
      expect(token.value).toBe(source.slice(token.start, token.end))
      end = token.end
    }
    expect(end).toBe(source.length)
    expect(highlight(source, { language }).match(/class="kirari-tag">Container<\/span>/g)).toHaveLength(4)
  })

  test(`${language.name} handles self-closing, paired and fragment siblings`, () => {
    for (const separator of ['', ' ', '\n', '\r\n\r\n', ' /* examples */ ']) {
      const source = `<First />${separator}<Second title=">" onClick={() => save({ ok: true })} />${separator}<><Third>{value}</Third></>`
      const result = pairs(source, language)
      expect(result.filter(t => t[0] === 'tag').map(t => t[1])).toEqual(['First', 'Second', 'Third', 'Third'])
      expect(result).toContainEqual(['attribute', 'onClick'])
      expect(result).toContainEqual(['function', 'save'])
    }
  })

  test(`${language.name} keeps comparisons after JSX in JavaScript`, () => {
    for (const expression of ['<Card /> <limit > floor', '<Card />\n<limit > floor', '<Card /> <limit / divisor > floor']) {
      for (const source of [expression, `<Outer>{${expression}}</Outer>`]) {
        const result = pairs(source, language)
        expect(result).toContainEqual(['variable', 'limit'])
        expect(result).not.toContainEqual(['tag', 'limit'])
        expect(tokenize(source, language).map(t => t.value).join('')).toBe(source)
      }
    }
    expect(pairs('<Card /> <limit > floor; const next = <Next />', language).filter(t => t[0] === 'tag').map(t => t[1])).toEqual(['Card', 'Next'])
  })

  test(`${language.name} preserves unfinished siblings`, () => {
    for (const source of ['<First />\n<Second', '<First />\n<Second title="open', '<First />\n<Second>{value', '<First />\n<Second><Nested />']) {
      expect(tokenize(source, language).map(t => t.value).join('')).toBe(source)
    }
  })

  test(`${language.name} updates sibling highlighting as streamed elements close`, () => {
    const source = '<First />\n<Second><Nested>{value}</Nested></Second>\n<Third />'
    const stream = createTokenStream(language)
    let tokens: Token[] = []
    for (let end = 1; end <= source.length; end++) {
      const patch = stream.write(source[end - 1]!)
      expect(patch.from === 0 || tokens.some(token => token.end === patch.from)).toBe(true)
      tokens = [...tokens.filter(token => token.start < patch.from), ...patch.tokens]
      expect(tokens).toEqual(tokenize(source.slice(0, end), language))
    }
  })
}

test('unfinished sibling candidates do not repeatedly rescan nested openings', () => {
  const source = '<First /><Second>'.repeat(10_000)
  const start = performance.now()
  expect(tokenize(source, tsx).map(t => t.value).join('')).toBe(source)
  expect(performance.now() - start).toBeLessThan(1500)
}, 5000)

test('TSX siblings preserve generic component arguments and generic arrows', () => {
  const result = pairs('<First />\n<List<Item> items={items} />; const id = <T,>(value: T): T => value', tsx)
  expect(result.filter(t => t[0] === 'tag').map(t => t[1])).toEqual(['First', 'List'])
  expect(result).toContainEqual(['attribute', 'items'])
  expect(result).toContainEqual(['type', 'Item'])
})

test('JSX highlights elements, attributes, entities and JavaScript expressions', () => {
  const source = 'const view = <Button disabled title="a > b" onClick={() => save(user.name)}>Hello &amp; {name}<Icon /></Button>'
  const result = pairs(source)
  for (const expected of [
    ['tag', 'Button'], ['tag', 'Icon'], ['attribute', 'disabled'], ['attribute', 'onClick'],
    ['string', '"a > b"'], ['function', 'save'], ['property', 'name'],
    ['text', 'Hello '], ['entity', '&amp;'], ['variable', 'name'],
  ]) expect(result).toContainEqual(expected)
  expect(highlight(source, { language: jsx })).toContain('class="kirari-tag">Button</span>')
})

test('nested JSX expressions preserve template state and resume outer JavaScript', () => {
  const source = 'const view = <>{items.map(item => <Row key={item.id}>{`Hi ${item.ok ? <b>{item.name}</b> : "!"}`}</Row>)}</>; done()'
  const result = pairs(source)
  expect(result).toContainEqual(['tag', 'Row'])
  expect(result).toContainEqual(['tag', 'b'])
  expect(result).toContainEqual(['property', 'name'])
  expect(result).toContainEqual(['string', '`'])
  expect(result).toContainEqual(['function', 'done'])
  expect(tokenize(source, jsx).map(t => t.value).join('')).toBe(source)
})

test('comparison operators and TSX generic arrows are not tags', () => {
  expect(pairs('a<b && c>d').filter(t => t[0] === 'tag')).toEqual([])
  expect(pairs('const id = <T,>(value: T): T => value', tsx).filter(t => t[0] === 'tag')).toEqual([])
  expect(pairs('const id = <T extends object>(value: T) => value', tsx).filter(t => t[0] === 'tag')).toEqual([])
  const result = pairs('const view: unknown = <Card active={true} />', tsx)
  expect(result).toContainEqual(['type', 'unknown'])
  expect(result).toContainEqual(['tag', 'Card'])
})

test('JSX strings, comments and regexes do not start elements', () => {
  const result = pairs('const a = "<A/>"; /* <B/> */ const re = /<C\\/>/; const view = <D>{/}/.test(x)}</D>')
  expect(result.filter(t => t[0] === 'tag').map(t => t[1])).toEqual(['D', 'D'])
  expect(result).toContainEqual(['regex', '/}/'])
})

test('HTML separates tag attributes from text and embeds script/style', () => {
  const source = '<!DOCTYPE html><!-- hi --><div class="box" hidden>&lt;hello&gt;</div><script>const count = 1</script><style>.box { color: red }</style>'
  const result = pairs(source, html)
  for (const expected of [
    ['comment', '<!-- hi -->'], ['tag', 'div'], ['attribute', 'class'], ['attribute', 'hidden'],
    ['entity', '&lt;'], ['text', 'hello'], ['keyword', 'const'], ['variable', 'count'], ['property', 'color'],
  ]) expect(result).toContainEqual(expected)
  expect(result.filter(t => t[0] === 'attribute').some(t => t[1] === 'hello')).toBe(false)
})

test('HTML raw text and XML CDATA preserve apparent markup', () => {
  expect(pairs('<textarea><b>literal</b></textarea>', html)).toContainEqual(['text', '<b>literal</b>'])
  const result = pairs('<?xml version="1.0"?><root xmlns:x="urn:test"><![CDATA[<b>raw</b>]]><x:item /></root>', xml)
  expect(result).toContainEqual(['tag', 'x:item'])
  expect(result).toContainEqual(['attribute', 'xmlns:x'])
  expect(result).toContainEqual(['string', '<![CDATA[<b>raw</b>]]>'])
})

test('literal angle brackets in markup prose do not start tags', () => {
  const source = 'one < two &amp; three > four'
  expect(pairs(source, html).filter(t => t[0] === 'tag' || t[0] === 'attribute')).toEqual([])
  expect(tokenize(source, html).map(t => t.value).join('')).toBe(source)
})

test('tag dispatch preserves question marks and slashes outside closing delimiters', () => {
  const source = '<x ?query="yes" / loose=?value></x>'
  const result = pairs(source, xml)
  expect(result).toContainEqual(['attribute', '?query'])
  expect(result).toContainEqual(['attribute', 'loose'])
  expect(result).toContainEqual(['string', '?value'])
  expect(result.filter(([type]) => type === 'tag').map(([, value]) => value)).toEqual(['x', 'x'])
  expect(tokenize(source, xml).map(token => token.value).join('')).toBe(source)
})

test('XML declarations keep quoted delimiters and internal subsets opaque', () => {
  const declaration = '<!DOCTYPE root [<!ENTITY value "a>b">]>'
  const result = pairs(declaration + '<root />', xml)
  expect(result[0]).toEqual(['keyword', declaration])
  expect(result.filter(([type]) => type === 'tag')).toEqual([['tag', 'root']])
})

test('unfinished declarations include trailing line terminators', () => {
  for (const ending of ['\n', '\r\n', '\u2028', '\u2029']) {
    for (const [opening, type] of [['<!--', 'comment'], ['<![CDATA[', 'string'], ['<?', 'keyword'], ['<!DOCTYPE root "', 'keyword']] as const) {
      const source = opening + 'unfinished' + ending
      expect(pairs(source, xml)).toEqual([[type, source]])
    }
  }
})

for (const language of [jsx, tsx, html, xml]) {
  test(`${language.name} preserves malformed input and offsets`, () => {
    for (const source of ['', '🙂\r\n<div title="unfinished', '<div>{`hi ${x', '<><A /></>', '<!-- incomplete', '<<<', '<x a={"}"}>text</x>', '<div>{\n/*comment*/\n}</div>']) {
      const tokens = tokenize(source, language)
      expect(tokens.map(t => t.value).join('')).toBe(source)
      let end = 0
      for (const token of tokens) {
        expect(token.start).toBe(end)
        expect(token.end).toBeGreaterThan(token.start)
        expect(token.value).toBe(source.slice(token.start, token.end))
        end = token.end
      }
      expect(end).toBe(source.length)
    }
  })
}

test('deeply nested elements do not recurse through the JavaScript call stack', () => {
  const source = '<a>'.repeat(5000) + 'text' + '</a>'.repeat(5000)
  expect(tokenize(source, jsx).map(t => t.value).join('')).toBe(source)
})
