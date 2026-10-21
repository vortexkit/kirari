import { expect, test } from 'bun:test'
import { tokenize } from '../src/core.js'
import { javascript } from '../src/languages/javascript.js'
import { jsx } from '../src/languages/jsx.js'
import { python } from '../src/languages/python.js'
import { tsx } from '../src/languages/tsx.js'
import { typescript } from '../src/languages/typescript.js'
import { createTokenStream } from '../src/stream.js'
import type { Language, Token } from '../src/types.js'

const pairs = (source: string, language: Language) => tokenize(source, language).map(token => [token.type, token.value])

for (const language of [javascript, typescript, jsx, tsx]) {
  test(`${language.name} highlights bare decorators and decorator factories`, () => {
    for (const source of ['@sealed\nclass Parcel {}', '@sealed()\nclass Parcel {}', 'class Parcel { @sealed field = 1 }']) {
      const result = pairs(source, language)
      expect(result, source).toContainEqual(['operator', '@'])
      expect(result, source).toContainEqual(['function', 'sealed'])
    }
  })

  test(`${language.name} retains namespace and member classifications in qualified decorators`, () => {
    for (const source of ['@registry.sealed\nclass Parcel {}', '@registry.sealed()\nclass Parcel {}', '@registry /* namespace */ .sealed\nclass Parcel {}']) {
      const result = pairs(source, language)
      expect(result, source).toContainEqual(['operator', '@'])
      expect(result, source).toContainEqual(['variable', 'registry'])
      expect(result, source).toContainEqual(['property', 'sealed'])
    }
  })

  test(`${language.name} keeps decorator-looking strings and comments opaque`, () => {
    const result = pairs('const label = "@sealed"; // @comment\n/* @other */', language)
    expect(result.filter(([type]) => type === 'operator' || type === 'function')).toEqual([['operator', '=']])
    expect(result).toContainEqual(['string', '"@sealed"'])
    expect(result).toContainEqual(['comment', '// @comment'])
    expect(result).toContainEqual(['comment', '/* @other */'])
  })

  test(`${language.name} distinguishes decorator member access from a spread operator`, () => {
    expect(pairs('@ sealed\n?.', language)).toContainEqual(['variable', 'sealed'])
    expect(pairs('@sealed\n...', language)).toContainEqual(['function', 'sealed'])
    const qualified = pairs('@registry /*c*/ .sealed', language)
    expect(qualified).toContainEqual(['variable', 'registry'])
    expect(qualified).toContainEqual(['property', 'sealed'])
  })
}

test('Python highlights bare decorators, stacked decorators, and decorator factories', () => {
  for (const source of [
    '@dataclass\nclass Parcel: pass',
    '@dataclass()\nclass Parcel: pass',
    '@cached\n@dataclass\nclass Parcel: pass',
    'class Parcel:\n    @cached\n    def label(self): pass',
  ]) {
    const result = pairs(source, python)
    expect(result, source).toContainEqual(['operator', '@'])
    for (const name of ['dataclass', 'cached']) {
      if (source.includes(name)) expect(result, source).toContainEqual(['function', name])
    }
  }
})

test('Python retains qualified decorators as a namespace and member', () => {
  for (const source of ['@registry.sealed\nclass Parcel: pass', '@registry.sealed()\nclass Parcel: pass']) {
    const result = pairs(source, python)
    expect(result, source).toContainEqual(['operator', '@'])
    expect(result, source).toContainEqual(['variable', 'registry'])
    expect(result, source).toContainEqual(['property', 'sealed'])
  }
})

test('Python decorator continuations stay on the same logical line', () => {
  for (const newline of ['\n', '\r\n']) {
    const bare = pairs(`@ \\${newline}cached${newline}def label(): pass`, python)
    expect(bare).toContainEqual(['operator', '@'])
    expect(bare).toContainEqual(['function', 'cached'])

    const qualified = pairs(`@registry \\${newline} .sealed${newline}def label(): pass`, python)
    expect(qualified).toContainEqual(['variable', 'registry'])
    expect(qualified).toContainEqual(['property', 'sealed'])

    const interrupted = pairs(`@${newline}cached${newline}def label(): pass`, python)
    expect(interrupted).toContainEqual(['variable', 'cached'])
  }
})

test('Python matrix multiplication operands remain variables across continued lines', () => {
  for (const newline of ['\n', '\r\n']) {
    for (const source of [
      'result = left @ right',
      `result = left \\${newline}    @ right`,
      `result = left @ \\${newline}    right`,
      `result = (${newline}    left${newline}    @ right${newline})`,
      `result = (${newline}    left @${newline}    right${newline})`,
      `result = (${newline}    left # matrix${newline}    @ right${newline})`,
      `@cached${newline}def multiply():${newline}    return left @ right`,
    ]) {
      const result = pairs(source, python)
      expect(result, source).toContainEqual(['operator', '@'])
      expect(result, source).toContainEqual(['variable', 'left'])
      expect(result, source).toContainEqual(['variable', 'right'])
    }
  }
})

test('Python keeps decorator-looking strings and comments opaque', () => {
  const result = pairs('label = "@dataclass"\n# @comment\ntext = """@other"""', python)
  expect(result.filter(([type]) => type === 'function')).toEqual([])
  expect(result).toContainEqual(['string', '"@dataclass"'])
  expect(result).toContainEqual(['comment', '# @comment'])
  expect(result).toContainEqual(['string', '"""@other"""'])
})

test('Python retains a checkpoint after a comment ending with a backslash', () => {
  const stream = createTokenStream(python)
  stream.write('# comment \\\nvalue')
  expect(stream.write('\nnext').from).toBeGreaterThan(0)
})

for (const original of [javascript, typescript, jsx, tsx, python]) {
  test(`${original.name} decorators retain classifications in renamed language copies`, () => {
    const language = { ...original, name: `custom-${original.name}` }
    const source = '@sealed\n' + (original === python ? 'class Parcel: pass' : 'class Parcel {}')
    expect(pairs(source, language)).toContainEqual(['operator', '@'])
    expect(pairs(source, language)).toContainEqual(['function', 'sealed'])
  })

  test(`${original.name} decorator prefixes preserve offsets and streaming patch parity`, () => {
    const sources = original === python ? [
      '@dataclass\nclass Café: pass\n@registry.sealed()\ndef label(): pass\n',
      'result = (\n    left\n    @ right\n)\n@cached\ndef multiply(): return left @ right\n',
      'result = left \\\r\n    @ right\r\n# @opaque 🚉\r\n',
      '@ \\\n cached\ndef label(): pass\n',
      '@registry \\\r\n .sealed\r\ndef label(): pass\r\n',
      '@\ncached\ndef label(): pass\n',
    ] : [
      '@sealed\nclass Café {}\n@factory()\nclass Parcel {}\n',
      '@registry.sealed\nclass Parcel { @cached method() {} }\nconst label = "@opaque 🚉";',
      '@ sealed\n?.',
      '@sealed\n...',
      '@registry /*c*/ .sealed',
    ]
    for (const language of [original, { ...original, name: `custom-${original.name}` }]) {
      for (const source of sources) {
        const stream = createTokenStream(language)
        let assembled: Token[] = []
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
          expect(offset).toBe(end)
          const patch = stream.write(source[end - 1]!)
          assembled = [...assembled.filter(token => token.start < patch.from), ...patch.tokens]
          expect(assembled, `${language.name}: ${prefix}`).toEqual(tokens)
        }
        const patch = stream.end()
        assembled = [...assembled.filter(token => token.start < patch.from), ...patch.tokens]
        expect(assembled).toEqual(tokenize(source, language))
      }
    }
  })
}
