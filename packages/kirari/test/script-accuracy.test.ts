import { expect, test } from 'bun:test'
import { tokenize } from '../src/tokenize.js'
import { createTokenStream } from '../src/stream.js'
import { javascript } from '../src/languages/javascript.js'
import { typescript } from '../src/languages/typescript.js'
import { jsx } from '../src/languages/jsx.js'
import { tsx } from '../src/languages/tsx.js'
import type { Language, Token } from '../src/types.js'

const pairs = (source: string, language: Language) => tokenize(source, language).map(token => [token.type, token.value])

test('repeated invalid identifier escapes use bounded matching work', () => {
  const source = 'a\\u0020'.repeat(1000)
  const execute = RegExp.prototype.exec
  let matched = 0
  let tokens: Token[]
  RegExp.prototype.exec = function (input: string) {
    const result = execute.call(this, input)
    matched += result?.[0].length ?? 0
    return result
  }
  try { tokens = tokenize(source, javascript) }
  finally { RegExp.prototype.exec = execute }
  expect(tokens.map(token => token.value).join('')).toBe(source)
  expect(matched).toBeLessThan(source.length * 8)
})

test('disabling identifier recognition also disables escaped identifiers', () => {
  const { identifier, ...language } = javascript
  expect(identifier).toBeDefined()
  const tokens = tokenize('parcel \\u0063rate', language)
  expect(tokens.filter(token => token.type === 'variable')).toEqual([])
  expect(tokens.map(token => token.value).join('')).toBe('parcel \\u0063rate')
})

for (const language of [javascript, typescript, jsx, tsx]) {
  test(`${language.name} recognizes regex literals after control conditions without changing division`, () => {
    for (const [control, condition] of [['if', 'check(inner())'], ['while', 'check(inner())'], ['for', '; check(inner());'], ['with', 'check(inner())'], ['for await', 'const row of rows']]) {
      const source = `${control} (${condition}) /gate[\\/]/u.test(path)`
      expect(pairs(source, language)).toContainEqual(['regex', '/gate[\\/]/u'])
    }
    for (const source of ['invoke(check()) / 2 / 3', '(value) / 2 / 3', 'object.if(value) / 2 / 3', 'object?.while(value) / 2 / 3']) {
      expect(tokenize(source, language).filter(token => token.type === 'regex')).toEqual([])
    }
  })

  test(`${language.name} preserves escaped Unicode identifiers as one token`, () => {
    for (const name of ['\\u0063rate', 'rack\\u0031', '\\u{10400}name', 'a\\u200Cb', 'a\\u0031\\u0032b\\u0063']) {
      expect(pairs(`const ${name} = 1`, language)).toContainEqual(['variable', name])
    }
    expect(pairs('object.\\u0072eturn', language)).toContainEqual(['property', '\\u0072eturn'])
    for (const name of ['\\u0020', '\\u0031item', '\\u{110000}', '\\uD800', '\\uD801\\uDC00']) {
      expect(pairs(`const ${name} = 1`, language)).not.toContainEqual(['variable', name])
    }
    const validPrefix = 'parcel'.repeat(500)
    expect(pairs(`${validPrefix}\\u0020`, language)).toContainEqual(['variable', validPrefix])
  })
}

for (const language of [typescript, tsx]) {
  test(`${language.name} recognizes member names after semicolons`, () => {
    for (const source of [
      'class Box { v: T; w: string; x: number }',
      'interface I { v: T; w: Box; x: number }',
      'type I = { v: T; w: Box; x: number }',
      'class Box { v: T; /* next member */\n w: string;\n x: number }',
    ]) {
      expect(pairs(source, language).filter(token => ['v', 'w', 'x'].includes(token[1]!)))
        .toEqual([['property', 'v'], ['property', 'w'], ['property', 'x']])
    }
  })

  test(`${language.name} keeps statement labels after semicolons as variables`, () => {
    for (const source of [
      'run(); label: while (ready) break label;',
      'function run() { step(); label: while (ready) break label; }',
      'class Box { run() { step(); label: while (ready) break label; } }',
      'class Box { static { step(); label: while (ready) break label; } }',
    ]) {
      expect(pairs(source, language).filter(token => token[1] === 'label'))
        .toEqual([['variable', 'label'], ['variable', 'label']])
    }
  })

  test(`${language.name} distinguishes type aliases and annotations from runtime expressions`, () => {
    const source = 'type Parcel = { label: string }; const cargo: Parcel = item; function finish(): void {}'
    expect(pairs(source, language).filter(token => token[1] === 'Parcel')).toEqual([['type', 'Parcel'], ['type', 'Parcel']])
    expect(pairs(source, language)).toContainEqual(['type', 'void'])
    for (const source of ['const unused = void execute()', 'const entry = { value: Parcel }', 'const result = active ? other : Parcel', 'object.type(Parcel)']) {
      expect(pairs(source, language)).not.toContainEqual(['type', 'Parcel'])
      expect(pairs(source, language)).not.toContainEqual(['type', 'void'])
    }
    expect(pairs('const select = (first: Parcel): Parcel => second', language)).toContainEqual(['variable', 'second'])
    expect(pairs('function deliver(item: Parcel) { return item }', language).filter(token => token[1] === 'item')).toEqual([['variable', 'item'], ['variable', 'item']])
    expect(pairs('class Box { constructor(public item: Parcel) {} }', language)).toContainEqual(['type', 'Parcel'])
    for (const source of ['call({ "key": value })', 'call({ [key]: value })', 'const object = ({ 1: value })']) {
      expect(pairs(source, language)).toContainEqual(['variable', 'value'])
    }
    expect(pairs('call({ [key]: make() })', language)).toContainEqual(['function', 'make'])
  })
}

test('TSX tag type arguments retain tag and attribute boundaries', () => {
  for (const source of ['const node = <Grid<string> rows={items} />', 'const node = <Grid<Map<string, Item[]>> rows={items}>ok</Grid>']) {
    const tokens = pairs(source, tsx)
    expect(tokens).toContainEqual(['tag', 'Grid'])
    expect(tokens).toContainEqual(['attribute', 'rows'])
    expect(tokens).toContainEqual(['type', 'string'])
    expect(tokens).toContainEqual(['variable', 'items'])
  }
  for (const source of ['const id = <T,>(input: T) => input', 'const id = <T extends object>(input: T) => input', 'value < Grid<string>(items)', 'const text = "<Grid<string> rows />"']) {
    expect(tokenize(source, tsx).filter(token => token.type === 'tag')).toEqual([])
  }
  for (const source of ['<Grid<string>>= text</Grid>', '<Grid<Map<string, Item>>>= text</Grid>']) {
    expect(pairs(source, tsx).filter(token => token[0] === 'tag')).toEqual([['tag', 'Grid'], ['tag', 'Grid']])
    expect(pairs(source, tsx)).toContainEqual(['text', '= text'])
  }
})

test('script fixes preserve every unfinished UTF-16 prefix and streaming token parity', () => {
  const sources = [
    'if (\ncheck(inner())\n)\n /gate[\\/]/u.test(path);\nnext()',
    'for await (const row of rows) /row/.test(row);\nnext()',
    'const \\u{10400}name = 1;\nobject.\\u0072eturn / 2;\n',
    'const a\\u0031\\u0032b = 1;\na\\u0020a\\u0020;\ncall({\n"key": value,\n[key]: make()\n})',
    'type\nParcel\n=\n{ label: string };\nconst cargo\n:\nParcel\n= item;\nfunction finish()\n:\nvoid {}',
    'const result = active\n ? other\n : Parcel;\nconst n = void execute()',
    'class Box { v: T;\n /* member */ w: string; x: number }\ninterface I { v: T; w: Box }',
    'const node = <Grid<Map<string, Item[]>>\n rows={items} />;\nnext()',
    '<Grid<Map<string, Item>>>= text</Grid>',
    '<Grid<A<B>= C>',
  ]
  for (const language of [javascript, typescript, jsx, tsx]) {
    for (const source of sources) {
      const stream = createTokenStream(language)
      const assembled: Token[] = []
      for (let end = 1; end <= source.length; end++) {
        const prefix = source.slice(0, end)
        const tokens = tokenize(prefix, language)
        let offset = 0
        for (const token of tokens) {
          expect(token.start).toBe(offset)
          expect(token.end).toBeGreaterThan(token.start)
          expect(token.value).toBe(prefix.slice(token.start, token.end))
          offset = token.end
        }
        expect(offset).toBe(prefix.length)
        const patch = stream.write(source[end - 1]!)
        while (assembled.length && assembled[assembled.length - 1]!.start >= patch.from) assembled.pop()
        assembled.push(...patch.tokens)
        expect(assembled).toEqual(tokens)
      }
    }
  }
})
