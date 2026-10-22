import { expect, test } from 'bun:test'
import { createTokenStream } from '../src/stream.js'
import { tokenize } from '../src/tokenize.js'
import { render } from '../src/render.js'
import { javascript } from '../src/languages/javascript.js'
import { typescript } from '../src/languages/typescript.js'
import { json } from '../src/languages/json.js'
import { jsonc } from '../src/languages/jsonc.js'
import { jsx } from '../src/languages/jsx.js'
import { tsx } from '../src/languages/tsx.js'
import { python } from '../src/languages/python.js'
import { shell } from '../src/languages/shell.js'
import { corpus } from './corpus/fixtures.js'
import type { Language, Token } from '../src/types.js'
import type { TokenPatch } from '../src/stream.js'

const apply = (tokens: Token[], patch: TokenPatch) => {
  expect(patch.from === 0 || tokens.some(token => token.end === patch.from)).toBe(true)
  while (tokens.length && tokens[tokens.length - 1]!.start >= patch.from) tokens.pop()
  tokens.push(...patch.tokens)
}

const languages = { javascript, typescript, json, tsx, python, shell }
for (const fixture of corpus) {
  test(`stream matches batch tokens after each chunk: ${fixture.id}`, () => {
    for (const size of [1, 2, 7, 64]) {
      const language = languages[fixture.language]
      const stream = createTokenStream(language)
      const tokens: Token[] = []
      for (let end = 0; end < fixture.source.length; end += size) {
        const chunk = fixture.source.slice(end, end + size)
        apply(tokens, stream.write(chunk))
        expect(tokens).toEqual(tokenize(fixture.source.slice(0, end + size), language))
      }
      apply(tokens, stream.end())
      expect(render(tokens)).toBe(render(tokenize(fixture.source, language)))
    }
  })
}

test('checkpoint streams retain lexical context and revise lookahead across lines', () => {
  const sources = [
    'const n = 1;\r\nobject.return / 2 / 3;\ncall\n\n (name)',
    'class\nThing {\nmethod\n() {}\n}\n',
    'const t = `start\n${fn({x: `nested\n${name}`})}\nend`;\nnext()',
    'const r = /a{2}/;\n/[abc\nconst v = 1;\n// comment\nnext()',
    '/* multiline\n comment */\nconst s = "continued\\\r\ntext";\nnext()',
    '🙂\n𐐀();\nconst café = "<&>";\n',
  ]
  for (const source of sources) {
    const stream = createTokenStream(javascript)
    const tokens: Token[] = []
    for (let index = 0; index < source.length; index++) {
      apply(tokens, stream.write(source[index]!))
      expect(tokens).toEqual(tokenize(source.slice(0, index + 1), javascript))
    }
  }
  const source = '{\n"key"\n\n : "value",\n"second":true\n}'
  const stream = createTokenStream(json)
  const tokens: Token[] = []
  for (let index = 0; index < source.length; index++) {
    apply(tokens, stream.write(source[index]!))
    expect(tokens).toEqual(tokenize(source.slice(0, index + 1), json))
  }
})

test('Python streams keep definitions that later lines can still change revisable', () => {
  const sources = [
    'x = (\nlambda: 1)\n',
    'x = ((\n1), 2)\ny = [\nlambda: 1]\n',
    'name\nother\n(1)\nvalue\n:= 2\n',
    'x = (lambda: 1)\n[0]\nz\n',
    'name\n: T\n= lambda: 0\nz\n',
    'name\n= (\nlambda: 1)\n(2)\nz\n',
    'x = (lambda: 1)\n(2)\n',
    'def < 1\n> name\n',
    'def pass\n.x\n',
    'def pass\n.x\nz\n',
    'def stub(): ...\n@overload\ndef stub(x): ...\nz\n',
    'def a.\n*\nb\nz\n',
    'def a.\nb\nz\n',
    'if ready:\n    handler = lambda: 0\nz\n',
    '[\nx:\n=lambda: 0\n]\ny:\n= lambda: 0\nz\n',
    'x: Callable[\n  [int], str] = lambda n: 1\nz\n',
    'x: int \\\n    = lambda: 0\nz\n',
    'x: int \\\r\n    = lambda: 0\nz\n',
    'def\nname\n',
    'def *\nname\n',
    'x = (lambda: 1)\n.5\n',
    'def a.b\n:\nc\n',
    'name\n\n= lambda: 0\n',
    'x: Dict[a, b]\n= lambda: 1\n',
    'lambda x:\n\npass = lambda: 0\n',
    'def a:\nb = lambda: 0\n',
    'value = f"{a\n}" + f\'\'\'\n{b}\n\'\'\'\nnext()\r\n',
    'x: int if a < b else str = lambda: 0\nif y > 2:\n    pass\n',
    'e: T < 1\n= lambda: 0\nz > 2\n',
  ]
  for (const source of sources) {
    for (let split = 1; split < source.length; split++) {
      const stream = createTokenStream(python)
      const tokens: Token[] = []
      apply(tokens, stream.write(source.slice(0, split)))
      expect(tokens).toEqual(tokenize(source.slice(0, split), python))
      for (let index = split; index < source.length; index++) {
        apply(tokens, stream.write(source[index]!))
        expect(tokens).toEqual(tokenize(source.slice(0, index + 1), python))
      }
    }
  }
})

test('Python line checkpoints bound rescanning inside multiline brackets', () => {
  for (const source of [
    'def f(\n' + '    arg: str,\n'.repeat(200) + '): pass\n',
    'values = {\n' + '    key: (lambda a, b: b),\n'.repeat(200) + '}\n',
  ]) {
    const stream = createTokenStream(python)
    const tokens: Token[] = []
    let work = 0
    for (let start = 0; start < source.length; start += 4) {
      const patch = stream.write(source.slice(start, start + 4))
      work += patch.length - patch.from
      apply(tokens, patch)
    }
    expect(tokens).toEqual(tokenize(source, python))
    expect(work).toBeLessThan(source.length * 20)
  }
})

test('Python line checkpoints bound rescanning', () => {
  const blocks = [
    'def greet(name: str) -> str:\n    return f"Hello, {name}!"  # note\n',
    'if ready:\n    run()\n',
    'for item in items:\n    print(item)\n',
    'import os\nvalue = other\n',
  ]
  for (const block of blocks) {
    const source = block.repeat(400)
    const stream = createTokenStream(python)
    expect(stream.mode).toBe('checkpoint')
    let work = 0
    for (let start = 0; start < source.length; start += 4) {
      const patch = stream.write(source.slice(start, start + 4))
      work += patch.length - patch.from
    }
    expect(work).toBeLessThan(source.length * 20)
  }
  expect(createTokenStream({ ...python }).mode).toBe('full')
})

test('JSX, TSX, and JSONC streams checkpoint at root lines and copies use full mode', () => {
  const component = 'export function Item({ name }: { name: string }) {\n  return (\n    <li className="item" onClick={() => open(name)}>\n      {name}\n    </li>\n  )\n}\n'
  for (const [language, block] of [[jsx, component.replace(': { name: string }', '')], [tsx, component], [tsx, 'const identity = <T\nextends Value>(value: T) => value;\n'], [jsonc, '{\n  // note\n  "key": [1, 2],\n}\n']] as const) {
    const source = block.repeat(100)
    const stream = createTokenStream(language)
    expect(stream.mode).toBe('checkpoint')
    expect(createTokenStream({ ...language }).mode).toBe('full')
    let work = 0
    for (let start = 0; start < source.length; start += 4) {
      const patch = stream.write(source.slice(start, start + 4))
      work += patch.length - patch.from
    }
    expect(work).toBeLessThan(source.length * 60)
  }
})

for (const language of [jsx, tsx]) {
  test(`${language.name} streams keep provisional extends tag rejections revisable`, () => {
    for (const newline of ['\n', '\r\n', '\r', '\u2028', '\u2029']) {
      for (const prefix of ['', 'const before = 1;\nconst view = ', '<span />\n']) {
        const source = `${prefix}<div${newline}extendsValue="x" />;\nnext()\n`
        for (let split = 1; split < source.length; split++) {
          const stream = createTokenStream(language)
          const tokens: Token[] = []
          apply(tokens, stream.write(source.slice(0, split)))
          expect(tokens).toEqual(tokenize(source.slice(0, split), language))
          for (let index = split; index < source.length; index++) {
            apply(tokens, stream.write(source[index]!))
            expect(tokens).toEqual(tokenize(source.slice(0, index + 1), language))
          }
          apply(tokens, stream.end())
          expect(tokens.filter(token => token.type === 'attribute').map(token => token.value)).toEqual(['extendsValue'])
        }
      }
    }
  })
}

test('script lookahead stays revisable while a slash on the last line may become a regex', () => {
  for (const language of [typescript, tsx]) {
    for (const newline of ['', '\n', '\r\n', '\r', '\u2028', '\u2029']) {
      const source = `[{a${newline}</]/>(1)`
      const stream = createTokenStream(language)
      const tokens: Token[] = []
      for (let index = 0; index < source.length; index++) {
        apply(tokens, stream.write(source[index]!))
        expect(tokens).toEqual(tokenize(source.slice(0, index + 1), language))
      }
    }
  }
})

test('line checkpoints bound rescanning for ordinary multiline code', () => {
  const source = 'const value = 42;\n'.repeat(1000)
  const stream = createTokenStream(javascript)
  let work = 0
  for (let start = 0; start < source.length; start += 16) {
    const patch = stream.write(source.slice(start, start + 16))
    work += patch.length - patch.from
  }
  expect(work).toBeLessThan(source.length * 5)
})

test('custom definitions use full tokenization and failures do not advance state', () => {
  let fail = false
  const language: Language = { name: 'custom', rules: [], tokenize: source => {
    if (fail) throw new Error('test failure')
    return source ? [{ type: 'string', value: source, start: 0, end: source.length }] : []
  } }
  const stream = createTokenStream(language)
  expect(stream.mode).toBe('full')
  stream.write('a')
  fail = true
  expect(() => stream.write('bad')).toThrow('test failure')
  fail = false
  expect(stream.write('b')).toEqual({ from: 0, tokens: tokenize('ab', language), length: 2 })
  expect(createTokenStream({ ...javascript }).mode).toBe('full')
})

test('empty writes, final chunks, closure, invalid chunks, and reset are explicit', () => {
  const stream = createTokenStream(json)
  expect(stream.mode).toBe('checkpoint')
  expect(stream.write('')).toEqual({ from: 0, tokens: [], length: 0 })
  expect(() => stream.write(null as unknown as string)).toThrow(TypeError)
  const tokens: Token[] = []
  apply(tokens, stream.write('{"a":'))
  apply(tokens, stream.end('true}'))
  expect(tokens).toEqual(tokenize('{"a":true}', json))
  expect(() => stream.write('')).toThrow(/closed/)
  expect(() => stream.end()).toThrow(/closed/)
  stream.reset()
  expect(stream.write('42').tokens).toEqual(tokenize('42', json))
})
