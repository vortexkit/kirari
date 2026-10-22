import { expect, test } from 'bun:test'
import { tokenize } from '../src/core.js'
import { python } from '../src/languages/python.js'

const pairs = (source: string) => tokenize(source, python).map(token => [token.type, token.value])

test.each([
  'def f(a: str, b: str): pass',
  'def f(a, b: str): pass',
  'def f(a: str, b): pass',
  'async def f(a: tuple[int, str], b: str): pass',
  'def f(a={k1: 1, k2: 2}, b: str): pass',
  'def f(\n    a: str, # first\n    b: str,\n): pass',
])('Python keeps annotated parameters as variables in %j', source => {
  const result = pairs(source)
  for (const name of ['a', 'b']) {
    expect(result).toContainEqual(['variable', name])
    expect(result).not.toContainEqual(['property', name])
  }
})

test('Python distinguishes dictionary keys, members, and lambda parameters in nested expressions', () => {
  const result = pairs('def f(a={k1: {inner: 1}, k2: (lambda x, y: obj.attr)}, b: str): pass')
  for (const name of ['k1', 'inner', 'k2', 'attr']) expect(result).toContainEqual(['property', name])
  for (const name of ['a', 'b', 'x', 'y']) expect(result).toContainEqual(['variable', name])
})

test.each([
  "x = {'f': lambda a, b: 1, next: 2}",
  "x = {'f': lambda a={key: 1}, b: 1, next: 2}",
  "x = {'f': lambda a=lambda c, d: 1, b: 2, next: 3}",
  "x = {'f': lambda a,\n    b: 1,\n    next: 2}",
  'f"{ {key: lambda a, b: 1, next: 2} }"',
])('Python keeps unparenthesized lambda parameters out of dictionary keys in %j', source => {
  const result = pairs(source)
  expect(result).toContainEqual(['variable', 'b'])
  expect(result).not.toContainEqual(['property', 'b'])
  expect(result).toContainEqual(['property', 'next'])
  if (source.includes('lambda c')) expect(result).toContainEqual(['variable', 'd'])
  if (source.includes('key:')) expect(result).toContainEqual(['property', 'key'])
})

test('Python bracket context preserves explicit property rules before identifier classification', () => {
  const language = { ...python, rules: [{ type: 'property', pattern: /SPECIAL/ }, ...python.rules] }
  const tokens = tokenize('def f(a, SPECIAL: str, b: str): pass', language)
  expect(tokens).toContainEqual({ type: 'property', value: 'SPECIAL', start: 9, end: 16 })
  expect(tokens).toContainEqual({ type: 'variable', value: 'b', start: 23, end: 24 })
})

test('Python f-strings expose expression variables, members, calls, and operators', () => {
  const result = pairs('label = f"Arrival {station.name}: {count + 1} {format(delay)} 🚉"')
  for (const pair of [['variable', 'station'], ['property', 'name'], ['variable', 'count'],
    ['operator', '+'], ['number', '1'], ['function', 'format'], ['variable', 'delay']]) {
    expect(result).toContainEqual(pair)
  }
})

test('Python f-string fields respect nested collections, strings, comments, and f-strings', () => {
  const source = 'f"{lookup({"key": [1, 2]})["key"]} {f"inner {user.name}"} {\nvalue # } ignored\n}"'
  const result = pairs(source)
  for (const pair of [['function', 'lookup'], ['string', '"key"'], ['variable', 'user'],
    ['property', 'name'], ['variable', 'value'], ['comment', '# } ignored']]) {
    expect(result).toContainEqual(pair)
  }
})

test('Python f-string format specifications keep text literal and highlight nested fields', () => {
  const result = pairs('f"{price!r:>{width}.{precision}f} {items[1:3]} {value != other} {(size := 2)}"')
  for (const name of ['price', 'width', 'precision', 'items', 'value', 'other', 'size']) {
    expect(result).toContainEqual(['variable', name])
  }
  expect(result).toContainEqual(['operator', '!='])
  expect(result).toContainEqual(['operator', ':='])
  expect(result).not.toContainEqual(['variable', 'r'])
  expect(result).not.toContainEqual(['variable', 'f'])
})

test('Python f-string equals alignment is format text outside parentheses', () => {
  const result = pairs('f"{value:=10} {(size := 2)}"')
  expect(result).toContainEqual(['string', '=10'])
  expect(result.filter(pair => pair[0] === 'operator' && pair[1] === ':=')).toHaveLength(1)
})

test('Python string prefixes and doubled braces do not create spurious fields', () => {
  for (const prefix of ['f', 'F', 'fr', 'Fr', 'rF', 'RF']) {
    for (const quote of ['"', "'", '"""', "'''"]) {
      const result = pairs(prefix + quote + '{{literal}} {{{value}}}' + quote)
      expect(result).toContainEqual(['variable', 'value'])
      expect(result).not.toContainEqual(['variable', 'literal'])
    }
  }
  for (const prefix of ['', 'r', 'b', 'u', 'br', 'rb']) {
    const source = prefix + '"{literal}"'
    expect(pairs(source)).toEqual([['string', source]])
  }
})

test('Python f-string backslashes preserve brace fields and Unicode-name escapes', () => {
  expect(pairs('f"\\{value} \\N{SNOWMAN}"')).toContainEqual(['variable', 'value'])
  expect(pairs('f"\\N{SNOWMAN}"')).not.toContainEqual(['variable', 'SNOWMAN'])
  expect(pairs('rf"\\N{value}"')).toContainEqual(['variable', 'value'])
  for (const newline of ['\n', '\r\n']) {
    expect(pairs('f"a\\' + newline + '{value}"')).toContainEqual(['variable', 'value'])
    expect(pairs('f"a' + newline + 'after = 1')).toContainEqual(['variable', 'after'])
  }
})

test('Python malformed Unicode-name escapes do not swallow the next statement', () => {
  expect(pairs('f"\\N{BROKEN"\nafter = 1')).toContainEqual(['variable', 'after'])
})

test('Python f-strings preserve every UTF-16 offset at every incomplete prefix', () => {
  const samples = [
    'f"{{escaped}} {station.name!r:>{width}} 🚉"\nafter = 1',
    'fr\'\'\'a\\{café} \\N{raw}\n{f"{value}"}\'\'\'',
    'f"{ {"key": [1, 2]}["key"] }"',
    'f"{value # } comment\n}"',
    'f"{unclosed:{{}}"',
  ]
  for (const sample of samples) {
    for (let length = 0; length <= sample.length; length++) {
      const source = sample.slice(0, length)
      const tokens = tokenize(source, python)
      expect(tokens.map(token => token.value).join('')).toBe(source)
      let offset = 0
      for (const token of tokens) {
        expect(token.start).toBe(offset)
        expect(token.end).toBeGreaterThan(offset)
        expect(token.value).toBe(source.slice(token.start, token.end))
        offset = token.end
      }
      expect(offset).toBe(source.length)
    }
  }
})

test('Python deeply nested f-strings do not use recursive calls', () => {
  const source = 'f"{'.repeat(2000) + 'value' + '}"'.repeat(2000)
  const tokens = tokenize(source, python)
  expect(tokens.map(token => token.value).join('')).toBe(source)
  expect(tokens).toContainEqual({ type: 'variable', value: 'value', start: 6000, end: 6005 })
  expect(tokens.filter(token => token.type === 'punctuation')).toHaveLength(4000)
})

test('Python derived languages preserve custom rule priority inside and outside fields', () => {
  const language = {
    ...python,
    rules: [{ type: 'constant', pattern: /SPECIAL/ }, { type: 'custom-string', pattern: /f"opaque[^\"]*"/ }, ...python.rules],
  }
  const result = tokenize('SPECIAL f"{SPECIAL}" f"opaque {hidden}"', language)
  expect(result.filter(token => token.type === 'constant').map(token => token.value)).toEqual(['SPECIAL', 'SPECIAL'])
  expect(result.filter(token => token.type === 'custom-string').map(token => token.value)).toEqual(['f"opaque {hidden}"'])
  expect(result.some(token => token.value === 'hidden')).toBe(false)
})

test('Python rule-only derivation retains complete opaque string matches', () => {
  const { tokenize: customTokenizer, ...language } = python
  const source = 'f"literal {name}"'
  expect(tokenize(source, language)).toEqual([{ type: 'string', value: source, start: 0, end: source.length }])
})

test('Python custom string openers do not trigger built-in f-string processing', () => {
  const language = { ...python, rules: [{ type: 'string', pattern: /f"/ }, ...python.rules] }
  const tokens = tokenize('f"literal {value}"', language)
  expect(tokens[0]).toEqual({ type: 'string', value: 'f"', start: 0, end: 2 })
  expect(tokens).toContainEqual({ type: 'variable', value: 'literal', start: 2, end: 9 })
})

test('Python annotations bind a function literal only within their logical line', () => {
  const functions = (source: string) => tokenize(source, python).filter(token => token.type === 'function').map(token => token.value)
  expect(functions('if ready:\n    handler = lambda: 0\n')).toEqual(['handler'])
  expect(functions('for item in items:\n    callback = lambda: 0\n')).toEqual(['callback'])
  expect(functions('count: int\nreset = lambda: 0\n')).toEqual(['reset'])
  expect(functions('count: int  # note\nreset = lambda: 0\n')).toEqual(['reset'])
  expect(functions('handler: Callable[\n    [int], str] = lambda n: str(n)\n')).toContain('handler')
  expect(functions('handler: int \\\n    = lambda: 0\n')).toContain('handler')
  expect(functions('handler: int \\\r\n    = lambda: 0\n')).toContain('handler')
  expect(functions('def run(callback: Callable\n        = lambda: 0): pass\n')).toContain('callback')
  expect(functions('handler: int if a < b else str = lambda: 0\nif x > 2:\n    pass\n')).toContain('handler')
})

