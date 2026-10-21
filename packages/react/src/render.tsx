import type { ReactNode } from 'react'
import type { Token } from '@vortexlabs/kirari/core'
import type { Decoration } from '@vortexlabs/kirari/decorations'
import type { CodeProps, LineRange } from './types.js'

const join = (...names: (string | undefined)[]): string => {
  return names.filter(Boolean).join(' ')
}

const splitsSurrogate = (source: string, offset: number): boolean => {
  const before = source.charCodeAt(offset - 1)
  const after = source.charCodeAt(offset)
  return before >= 0xd800 && before <= 0xdbff && after >= 0xdc00 && after <= 0xdfff
}

const highlighted = (ranges: readonly LineRange[]): (line: number) => boolean => {
  const pairs = ranges.map(range => typeof range === 'number' ? [range, range] as const : range)
  return line => pairs.some(([first, last]) => first <= line && line <= last)
}

const assertContiguous = (tokens: readonly Token[]): void => {
  let offset = 0
  for (const token of tokens) {
    if (token.start !== offset || token.end !== offset + token.value.length) {
      throw new RangeError('Kirari: tokens must cover contiguous source offsets starting at zero')
    }
    offset = token.end
  }
}

type DecorationEvent = { offset: number; index: number; entering: boolean }

/** Validated enter/leave points for each decoration, in source order. */
const decorationEvents = (decorations: readonly Decoration[], source: string): DecorationEvent[] => {
  const events: DecorationEvent[] = []
  for (const [index, decoration] of decorations.entries()) {
    if (!Number.isInteger(decoration.start) || !Number.isInteger(decoration.end)
      || decoration.start < 0 || decoration.start >= decoration.end || decoration.end > source.length) {
      throw new RangeError('Kirari: decoration offsets must be integers with 0 <= start < end <= source length')
    }
    if (splitsSurrogate(source, decoration.start) || splitsSurrogate(source, decoration.end)) {
      throw new RangeError('Kirari: decoration offsets must not split a UTF-16 surrogate pair')
    }
    events.push({ offset: decoration.start, index, entering: true }, { offset: decoration.end, index, entering: false })
  }
  return events.sort((a, b) => a.offset - b.offset)
}

const codeNodes = (tokens: readonly Token[], options: Omit<CodeProps, 'children' | 'tokens' | 'language'> = {}): ReactNode[] => {
  assertContiguous(tokens)
  const source = tokens.map(token => token.value).join('')
  const decorations = options.decorations ?? []
  const events = decorationEvents(decorations, source)

  // Resolve callbacks once so tokens split by lines or decorations see them a single time.
  const tokenClasses = tokens.map(token => join(
    options.classes && Object.hasOwn(options.classes, token.type) ? options.classes[token.type] : undefined,
    options.tokenClassName?.(token),
  ))
  const active = new Set<number>()
  let activeClasses = ''
  let eventIndex = 0
  let tokenIndex = 0

  const rangeNodes = (start: number, end: number): ReactNode[] => {
    const nodes: ReactNode[] = []
    while (start < end) {
      while (tokens[tokenIndex]!.end <= start) tokenIndex++
      let changed = false
      while (eventIndex < events.length && events[eventIndex]!.offset <= start) {
        const event = events[eventIndex++]!
        if (event.entering) active.add(event.index)
        else active.delete(event.index)
        changed = true
      }
      if (changed) activeClasses = [...active].sort((a, b) => a - b).map(index => decorations[index]!.className).join(' ')
      const token = tokens[tokenIndex]!
      const stop = Math.min(end, token.end, events[eventIndex]?.offset ?? end)
      const value = source.slice(start, stop)
      const extra = join(tokenClasses[tokenIndex], activeClasses)
      nodes.push(token.type === 'text' && !extra
        ? value
        : <span key={start} className={join(`kirari-${token.type}`, extra)}>{value}</span>)
      start = stop
    }
    return nodes
  }

  const ranges = options.highlightLines ?? []
  if (!options.lines && ranges.length === 0) return rangeNodes(0, source.length)
  const isHighlighted = highlighted(ranges)
  const nodes: ReactNode[] = []
  const newline = /\r\n|\r|\n/g
  let start = 0
  let number = 1
  do {
    const match = newline.exec(source)
    const end = match?.index ?? source.length
    const className = join('kirari-line', options.lineClassName?.({ number, start, end }),
      isHighlighted(number) ? 'kirari-line-highlighted' : undefined)
    nodes.push(<span key={`line-${number}`} className={className} data-line={number}>{rangeNodes(start, end)}</span>)
    if (!match) break
    nodes.push(match[0])
    start = end + match[0].length
    if (start === source.length) break
    number++
  } while (true)
  return nodes
}

/** Renders highlighted tokens and forwards the remaining props to the pre element. */
export const renderCode = (tokens: readonly Token[], options: Omit<CodeProps, 'children' | 'tokens' | 'language'>): ReactNode => {
  const { classes, tokenClassName, decorations, lines, lineClassName, highlightLines, className, ...props } = options
  const nodes = codeNodes(tokens, options)
  return <pre {...props} className={join('kirari', className)}><code>{nodes}</code></pre>
}
