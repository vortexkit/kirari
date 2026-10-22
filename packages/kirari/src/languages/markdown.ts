import { tokenize } from '../tokenize.js'
import type { Language, Token } from '../types.js'

const inline: Language = {
  name: 'markdown-inline',
  rules: [
    { type: 'text', pattern: /\\[!"#$%&'()*+,\-./:;<=>?@[\]\\^_`{|}~]/ },
    { type: 'string', pattern: /!?\[[^\[\]\r\n]*\]\([^\)\r\n]*(?:\)|$)|<https?:\/\/[^>\r\n]*(?:>|$)/ },
    { type: 'punctuation', pattern: /\*+|_+|~~|^[ \t]*(?:>|[-+*](?=\s)|\d+[.)](?=\s))/m },
    { type: 'text', pattern: /[^\\!\[*_~<>`\r\n]+/ },
  ],
}

const markdownTokens = (source: string, language: Language): Token[] => {
  const { tokenize: _tokenize, ...base } = language
  const tokens: Token[] = []
  let offset = 0
  let fence: { char: string; length: number; start: number } | undefined
  const lines = source.match(/[^\r\n]+(?:\r\n?|\n)?|\r\n?|\n/g) ?? []
  const emit = (type: string, start: number, end: number) => {
    if (end > start) tokens.push({ type, value: source.slice(start, end), start, end })
  }
  // A heading ends at its line break; the break itself is text, as after any other line.
  const emitHeading = (start: number, line: string) => {
    const end = start + line.replace(/[\r\n]+$/, '').length
    emit('heading', start, end)
    emit('text', end, start + line.length)
  }
  const emitInline = (value: string, start: number) => {
    for (const token of tokenize(value, base)) tokens.push({ ...token, start: token.start + start, end: token.end + start })
  }
  for (let index = 0; index < lines.length; index++) {
    const line = lines[index]!
    const body = line.replace(/[\r\n]+$/, '')
    if (fence) {
      const close = /^ {0,3}(`+|~+)[ \t]*$/.exec(body)
      if (close && close[1]![0] === fence.char && close[1]!.length >= fence.length) {
        emit('string', fence.start, offset + line.length)
        fence = undefined
      }
    } else {
      const open = /^ {0,3}(`{3,}|~{3,})(.*)$/.exec(body)
      if (open && (open[1]![0] !== '`' || !open[2]!.includes('`'))) {
        fence = { char: open[1]![0]!, length: open[1]!.length, start: offset }
      } else if (/^ {0,3}#{1,6}(?:[ \t]|$)/.test(body)
        || (body.trim() && /^ {0,3}(?:=+|-+)[ \t]*(?:\r?\n|\r)?$/.test(lines[index + 1] ?? ''))) {
        emitHeading(offset, line)
        if (!/^ {0,3}#/.test(body)) {
          offset += line.length
          const underline = lines[++index]!
          emitHeading(offset, underline)
          offset += underline.length
          continue
        }
      } else {
        // Index delimiters once so unmatched backtick runs never rescan the line.
        const runs = [...body.matchAll(/`+/g)]
        const next = new Map<number, number>()
        const closing = new Map<number, number>()
        for (let i = runs.length - 1; i >= 0; i--) {
          const run = runs[i]!
          const length = run[0].length
          if (next.has(length)) closing.set(i, next.get(length)!)
          next.set(length, i)
        }
        let start = 0
        for (let i = 0; i < runs.length; i++) {
          const run = runs[i]!
          // shortcut: inline code spans are line-local; use a Markdown parser for cross-line spans.
          let escapes = 0
          for (let cursor = run.index! - 1; cursor >= 0 && body[cursor] === '\\'; cursor--) escapes++
          if (escapes % 2) continue
          const endIndex = closing.get(i)
          if (endIndex === undefined) continue
          const endRun = runs[endIndex]!
          emitInline(line.slice(start, run.index), offset + start)
          start = endRun.index! + endRun[0].length
          emit('string', offset + run.index!, offset + start)
          i = endIndex
        }
        emitInline(line.slice(start), offset + start)
      }
    }
    offset += line.length
  }
  if (fence) emit('string', fence.start, source.length)
  return tokens
}

export const markdown: Language = { name: 'markdown', rules: inline.rules, tokenize: markdownTokens }
