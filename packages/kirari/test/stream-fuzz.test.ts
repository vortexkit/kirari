import { expect, test } from 'bun:test'
import fc from 'fast-check'
import { createTokenStream } from '../src/stream.js'
import { tokenize } from '../src/tokenize.js'
import { javascript } from '../src/languages/javascript.js'
import { typescript } from '../src/languages/typescript.js'
import { json } from '../src/languages/json.js'
import { jsonc } from '../src/languages/jsonc.js'
import { jsx } from '../src/languages/jsx.js'
import { tsx } from '../src/languages/tsx.js'
import { python } from '../src/languages/python.js'
import type { Language, Token } from '../src/types.js'

/** Streams `source` in chunks of `sizes`, cycled, and expects batch tokens after every write. */
const checkPartitions = (source: string, language: Language, sizes: readonly number[]) => {
  const stream = createTokenStream(language)
  let tokens: readonly Token[] = []
  let end = 0
  const chunks: string[] = []
  while (end < source.length) {
    const chunk = source.slice(end, end + sizes[chunks.length % sizes.length]!)
    chunks.push(chunk)
    end += chunk.length
    const patch = stream.write(chunk)
    const context = `${language.name}: ${JSON.stringify(chunks)}`
    expect(patch.length, context).toBe(end)
    expect(patch.from === 0 || tokens.some(token => token.end === patch.from), context).toBe(true)
    tokens = [...tokens.filter(token => token.start < patch.from), ...patch.tokens]
    expect(tokens, context).toEqual(tokenize(source.slice(0, end), language))
  }
  const patch = stream.end()
  tokens = [...tokens.filter(token => token.start < patch.from), ...patch.tokens]
  expect(tokens).toEqual(tokenize(source, language))
}

// `bun run test:fuzz` raises the run count to search for rare mismatches while adding a language.
const runs = Number(process.env.KIRARI_FUZZ_RUNS ?? 300)
const timeout = Math.max(30_000, runs * 20)

/**
 * Checks generated sources and chunk sizes. A failure shrinks to the fewest fragments and the
 * smallest chunks, and prints the seed and path that replay it through `fc.assert` options.
 */
const checkStreams = (language: Language, fragments: readonly string[], sources: readonly string[]) => {
  const source = fc.array(fc.constantFrom(...fragments), { maxLength: 30, size: 'medium' }).map(parts => parts.join(''))
  // Single UTF-16 unit chunks visit every prefix, including split surrogate pairs.
  const sizes = fc.oneof(fc.constant([1]), fc.array(fc.integer({ min: 1, max: 11 }), { minLength: 1, maxLength: 8 }))
  const examples = sources.flatMap(text => [[text, [1]], [text, [3, 1, 7]]] as [string, number[]][])
  fc.assert(fc.property(source, sizes, (text, chunks) => checkPartitions(text, language, chunks)), { numRuns: runs, examples })
}

const scriptFragments = [
  'name', 'class', 'return', 'true', 'null', 'number', '"key"',
  '0', 'e+', '_', '/', '/[', ']', '//', '/*', '*/', '\\',
  '"', "'", '`', '${', '{', '}', '(', ')', ':', '.', '?.', ';',
  ' ', '\t', '\n', '\r', '\r\n', ' ', ' ',
  '\ud801', '\udc00', '🙂', '𐐀', '<&>',
]

const scriptSources = [
  'class Box {\n v: T;\n w: string;\n target: Handler = () => null;\n}\n',
  'interface I { v: T; /* member */\n w: Box; }\n',
  'class Counter {\n #count = 0;\n #step() {}\n add() { this.#step(); return #count in this }\n}\n',
  'name\n\t(\nname\n)',
  '{name\n\t: true, "key"\r\n: null}',
  'return /[a\\/]*/g\nname()',
  'return /[\n\nname\n()/g',
  '/*\n*/ name\n//\n(\n)',
  '`head\n${`nested\n${name\n()}`}\ntail`\nnext()',
  '"escaped\\\r\nline"\nnext()',
  '\ud801\n\udc00\n𐐀\n()\n🙂\n𐐀',
  'true\nfalse\rnull name ()',
]

for (const language of [javascript, typescript, json, jsonc]) {
  test(`stream patches match batch tokens for generated prefixes and partitions: ${language.name}`, () => {
    checkStreams(language, scriptFragments, scriptSources)
  }, timeout)
}

const pythonFragments = [
  'name', 'x', 'def', 'class', 'lambda', 'lambda x', 'if', 'in', 'pass', 'None', 'self', 'await',
  'name: T', 'x: int', 'y: Callable[[int], str]', '= lambda: 0', 'x = (', 'lambda: 1)', 'def a.b',
  ':', '=', ':=', '(', ')', '[', ']', '{', '}', ',', '.', '*', '**', '&', '<', '>', '>>', '->', '@dec',
  '1', '.5', '"s"', '"""', "'''", 'f"', "f'", 'f"""', '{a}', 'rb"', '#c', '\\',
  ' ', ' ', ' ', '\n', '\n', '\r\n', '\r', '    ',
]

const pythonSources = [
  'handler: int if a < b else str = lambda: 0\nif x > 2:\n    pass\n',
  'value = f"{a\n}" + f\'\'\'\n{b}\n\'\'\'\nnext()\r\n',
]

test('stream patches match batch tokens for generated prefixes and partitions: python', () => {
  checkStreams(python, pythonFragments, pythonSources)
}, timeout)

const markupFragments = [
  'return', 'const x =', '(', ')', '{', '}', '[', ']', ',', ';', ':', '=>', '?', 'a < b', 'a > b', '<', '>', '/',
  '<div', '<div>', '</div>', '<b>', '</b>', '<>', '</>', '/>', '<Select<Item>', '<T,>', 'className="x"', "id='y'",
  '{name}', '{`t${a}`}', 'text', '&amp;', '<!-- c -->', '// c', '/* c */', '"s"', '`', '${', 'name()', 'function f',
  ' ', ' ', ' ', '\n', '\n', '\r\n', '  ',
]

const markupSources = [
  'class Box {\n v: T;\n w: string;\n target: Handler = () => <Box />;\n}\n',
  'const a = <div>\n  {items.map(item =>\n    <Item key={item} />)}\n</div>\n<span>\nnext()\n',
  'return (\n  <>\n    <b>x</b>\n    <i>y</i>\n  </>\n)\nconst t = a < b\n',
  'const a = <b>x</b>\n<i>\ny\n</i>\nnext()\n',
  'if (a)\n/re/.test(b)\nclass A {\nmethod\n() {}\n}\n',
  '<></><div\n></div>',
  '[{a\n</]/>(1)',
]

for (const language of [jsx, tsx]) {
  test(`stream patches match batch tokens for generated prefixes and partitions: ${language.name}`, () => {
    checkStreams(language, markupFragments, markupSources)
  }, timeout)
}
