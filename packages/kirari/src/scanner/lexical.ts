import type { Token } from '../types.js'

const unicodeEscape = /\\u(?:([\da-fA-F]{4})|\{([\da-fA-F]{1,6})\})/y
const continuation = /[$\u200c\u200d\p{ID_Continue}]+/uy

const spaces = /\s*/y
export const lineBreak = /[\r\n\u2028\u2029]/

/** Index of the last line break in `source`, or -1. */
export const lastLineBreak = (source: string): number => {
  let index = source.length - 1
  while (index >= 0 && !lineBreak.test(source[index]!)) index--
  return index
}

/** End of a delimited span, including the delimiter, or EOF when it is unfinished. */
export const delimiterEnd = (source: string, delimiter: string, from: number): number => {
  const end = source.indexOf(delimiter, from)
  return end < 0 ? source.length : end + delimiter.length
}

/** The first non-whitespace character at or after `index`. */
export const nextVisibleChar = (source: string, index: number): string | undefined => {
  spaces.lastIndex = index
  spaces.test(source)
  return source[spaces.lastIndex]
}

// Scans template text up to the next `${`, the closing backtick, or the end of source.
export const templateChunk = (source: string, start: number): { end: number; closed: boolean } => {
  let end = start
  while (end < source.length) {
    if (source[end] === '\\') end = Math.min(end + 2, source.length)
    else if (source[end] === '`') return { end: end + 1, closed: true }
    else if (source.startsWith('${', end)) break
    else end++
  }
  return { end, closed: false }
}

// Extends an identifier through `\\u` escapes that decode to valid identifier characters.
export const escapedIdentifierEnd = (source: string, start: number, end: number): number => {
  while (source[end] === '\\') {
    unicodeEscape.lastIndex = end
    const escape = unicodeEscape.exec(source)
    if (!escape) break
    const value = parseInt(escape[1] ?? escape[2]!, 16)
    const point = value <= 0x10ffff ? String.fromCodePoint(value) : ' '
    if (!(end === start ? /^[$_\p{ID_Start}]$/u : /^[$\u200c\u200d\p{ID_Continue}]$/u).test(point)) break
    end += escape[0].length
    continuation.lastIndex = end
    const suffix = continuation.exec(source)
    if (suffix?.index === end) end += suffix[0].length
  }
  return end
}

export const canStartRegex = (previous: Token | undefined): boolean => {
  // shortcut: lexical context cannot resolve every slash; use a parser for semantic accuracy.
  return !previous || previous.type !== 'property' && /^(?:[([{,:;=!?&|+*%~<>^-]|\$\{|=>|&&|\|\||\?\?|===?|!==?|[+*/%&|^-]=|return|throw|case|delete|void|typeof|yield|await|in|of)$/.test(previous.value)
}

export const regexEnd = (source: string, start: number, failed: Set<number>): number => {
  let inClass = false
  const visited: number[] = []
  for (let end = start + 1; end < source.length; end++) {
    const state = end * 2 + Number(inClass)
    if (failed.has(state)) break
    visited.push(state)
    const char = source[end]!
    if (lineBreak.test(char)) break
    if (char === '\\') {
      if (lineBreak.test(source[end + 1] ?? '')) break
      end++
    } else if (char === '[') inClass = true
    else if (char === ']') inClass = false
    else if (char === '/' && !inClass) {
      end++
      while (end < source.length && /[a-z]/i.test(source[end]!)) end++
      return end
    }
  }
  // Failed states prevent repeated scans of malformed input such as /[/[/[.
  for (const state of visited) failed.add(state)
  return start
}
