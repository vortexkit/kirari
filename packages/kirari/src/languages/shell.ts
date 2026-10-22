import { definitionsFor } from '../grammars/definitions.js'
import { scan } from '../tokenize.js'
import type { Language, Token } from '../types.js'

const stringRule = { type: 'string', pattern: /'[^']*(?:'|$)|"(?:\\(?:[\s\S]|$)|[^"\\])*(?:"|$)|`(?:\\(?:[\s\S]|$)|[^`\\])*(?:`|$)/ }
const parameterRule = { type: 'variable', pattern: /\$(?:\{[^}\r\n]*(?:\}|$)|[a-zA-Z_]\w*|[\d@*#?$!_-])/ }
const quoteOpening = { type: 'shell-quote', pattern: /["`]/ }
const expansionOpening = { type: 'shell-expansion', pattern: /\$[({]/ }

const parameter = /\$(?:[a-zA-Z_]\w*|[\d@*#?$!_-])/y
type Heredoc = { delimiter: string; quoted: boolean; tabs: boolean }

const tokenizeShell = (source: string, language: Language): Token[] => {
  const tokens: Token[] = []
  const pending: Heredoc[] = []
  const scanner = scan(source, {
    ...language,
    rules: language.rules.flatMap(rule => rule.pattern === stringRule.pattern ? [quoteOpening, rule]
      : rule.pattern === parameterRule.pattern ? [expansionOpening, rule] : [rule]),
  })
  let result = scanner.next()
  let arithmetic = 0

  const emit = (type: string, start: number, end: number): void => {
    if (end <= start) return
    const last = tokens[tokens.length - 1]
    if (type === 'text' && last?.type === 'text' && last.end === start) {
      tokens[tokens.length - 1] = { ...last, end, value: last.value + source.slice(start, end) }
    } else tokens.push({ type, start, end, value: source.slice(start, end) })
  }

  const interpolate = (start: number, limit: number, quote: boolean): number => {
    let part = start
    let position = start + Number(quote)
    while (position < limit) {
      const char = source[position]
      if (char === '\\') { position = Math.min(position + 2, limit); continue }
      if (quote && char === '"') { position++; break }
      let end = position
      if (char === '`' || source.startsWith('${', position) || source.startsWith('$(', position)) {
        end = expansionEnd(source, position, limit)
      } else if (char === '$') {
        parameter.lastIndex = position
        const match = parameter.exec(source)
        if (match) end = Math.min(position + match[0].length, limit)
      }
      if (end > position) {
        emit('string', part, position)
        emit('variable', position, end)
        part = position = end
      } else position++
    }
    emit('string', part, position)
    return position
  }

  while (!result.done) {
    const token = result.value
    let end = token.end
    if (token.value === '(' && (arithmetic || source.startsWith('((', token.start))) arithmetic++
    else if (token.value === ')' && arithmetic) arithmetic--
    if (token.type === quoteOpening.type && token.value === '"') {
      end = interpolate(token.start, source.length, true)
    } else if (token.type === expansionOpening.type || token.type === quoteOpening.type) {
      end = expansionEnd(source, token.start, source.length)
      emit('variable', token.start, end)
    } else if (!arithmetic && token.type === 'operator' && (token.value === '<<' || token.value === '<<-')) {
      emit(token.type, token.start, end)
      const word = delimiterWord(source, end)
      if (word) {
        emit('text', end, word.start)
        emit('string', word.start, word.end)
        pending.push({ delimiter: word.value, quoted: word.quoted, tabs: token.value === '<<-' })
        end = word.end
      }
    } else if (pending.length && token.type === 'text' && !token.value.startsWith('\\') && token.value.includes('\n')) {
      end = source.indexOf('\n', token.start) + 1
      emit('text', token.start, end)
      for (const heredoc of pending) {
        const body = heredocEnd(source, end, heredoc)
        if (heredoc.quoted) emit('string', end, body.start)
        else interpolate(end, body.start, false)
        emit('string', body.start, body.end)
        end = body.end
      }
      pending.length = 0
    } else emit(token.type, token.start, end)
    result = end === token.end ? scanner.next() : scanner.next(end)
  }
  return tokens
}

const expansionEnd = (source: string, start: number, limit: number): number => {
  const stack = [source[start] === '`' ? '`' : source[start + 1] === '{' ? '}' : ')']
  let position = start + (source[start] === '`' ? 1 : 2)
  // shortcut: substitutions retain one variable token; use a shell parser for command grammar and heredocs inside substitutions.
  while (position < limit && stack.length) {
    const char = source[position]!
    const close = stack[stack.length - 1]!
    if (char === '\\' && close !== "'") { position = Math.min(position + 2, limit); continue }
    if (char === close) { stack.pop(); position++; continue }
    if (close !== "'") {
      if (char === '$' && (source[position + 1] === '{' || source[position + 1] === '(')) {
        stack.push(source[position + 1] === '{' ? '}' : ')')
        position += 2
        continue
      }
      if ((close !== '"' && close !== '`' && (char === "'" || char === '"')) || char === '`') stack.push(char)
      else if (close === ')' && char === '(') stack.push(')')
    }
    position++
  }
  return position
}

// shortcut: delimiter words support POSIX quotes and escapes; add ANSI-C decoding for Bash $'...' delimiters.
const delimiterWord = (source: string, position: number): { start: number; end: number; value: string; quoted: boolean } | undefined => {
  while (position < source.length) {
    if (source[position] === ' ' || source[position] === '\t') position++
    else if (source.startsWith('\\\n', position)) position += 2
    else break
  }
  const start = position
  if (source[start] === '#') return undefined
  let value = ''
  let quote = ''
  let quoted = false
  while (position < source.length) {
    const char = source[position]!
    if (!quote && /[ \t\r\n;&|<>()]/.test(char)) break
    if (char === quote) { quote = ''; position++; continue }
    if (!quote && (char === "'" || char === '"')) { quoted = true; quote = char; position++; continue }
    if (char === '\\' && quote !== "'" && (!quote || /[$`"\\\n]/.test(source[position + 1] ?? ''))) {
      position++
      if (source[position] === '\n') { position++; continue }
      quoted = true
    }
    if (position < source.length) value += source[position++]
  }
  return position > start ? { start, end: position, value, quoted } : undefined
}

const heredocEnd = (source: string, position: number, heredoc: Heredoc): { start: number; end: number } => {
  while (position < source.length) {
    const start = position
    let line = ''
    let continued: boolean
    do {
      const newline = source.indexOf('\n', position)
      const end = newline < 0 ? source.length : newline
      const text = source.slice(position, end).replace(/\r$/, '')
      const slashes = text.match(/\\+$/)?.[0].length ?? 0
      continued = !heredoc.quoted && newline >= 0 && slashes % 2 === 1
      line += continued ? text.slice(0, -1) : text
      position = newline < 0 ? source.length : newline + 1
    } while (continued && position < source.length)
    if ((heredoc.tabs ? line.replace(/^\t+/, '') : line) === heredoc.delimiter) return { start, end: position }
  }
  return { start: source.length, end: source.length }
}

export const shell: Language = {
  name: 'shell',
  definitions: definitionsFor({ declaration: /^function$/ }),
  tokenize: tokenizeShell,
  identifier: /[a-zA-Z_][a-zA-Z_\d-]*/,
  keywords: 'case do done elif else esac fi for function if in select then time until while'.split(' '),
  rules: [
    { type: 'text', pattern: /\\(?:\r?\n|[\s\S]|$)/ },
    { type: 'text', pattern: /\s+/ },
    // Escaped separators stay in words; line continuations do not create a boundary.
    { type: 'comment', pattern: /(?=#)(?<=(?:^|(?<!\\)(?:\\\\)*[\s;|&()])(?:\\\n)*)#[^\r\n]*/ },
    stringRule, parameterRule,
    { type: 'variable', pattern: /[a-zA-Z_]\w*(?==)/ },
    { type: 'number', pattern: /\b\d+(?:\.\d+)?\b/ },
    { type: 'operator', pattern: /&&|\|\||>>?|<<<|<<-?|[|&=;]/ },
    { type: 'punctuation', pattern: /[{}()[\]]/ },
  ],
}
