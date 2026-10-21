import type { ElementContent } from 'hast'
import type { Token } from '@vortexlabs/kirari/core'
import type { Options } from './index.js'

export const classes = (value: unknown): string[] => {
  return (Array.isArray(value) ? value : [value])
    .filter((item): item is string | number => typeof item === 'string' || typeof item === 'number')
    .flatMap(item => String(item).split(/[\t\n\f\r ]+/).filter(Boolean))
}

export const tokenNodes = (source: string, tokens: readonly Token[], options: Options, ranges: readonly [number, number][]): ElementContent[] => {
  let offset = 0
  for (const { start, end, value } of tokens) {
    if (start !== offset || end !== offset + value.length
      || value !== source.slice(start, end)) {
      throw new RangeError('Kirari: tokens must cover the original code contiguously')
    }
    offset = end
  }
  if (offset !== source.length) throw new RangeError('Kirari: tokens must cover the original code contiguously')

  // Resolve callbacks once before any multiline token is split into line spans.
  const tokenClasses = tokens.map(token => {
    const mapped = options.classes && Object.hasOwn(options.classes, token.type) ? options.classes[token.type] : undefined
    const extra = [mapped, options.className?.(token)].filter(Boolean).join(' ')
    return token.type === 'text' && !extra ? [] : classes(`kirari-${token.type}${extra ? ` ${extra}` : ''}`)
  })
  let tokenIndex = 0
  const rangeNodes = (start: number, end: number): ElementContent[] => {
    const nodes: ElementContent[] = []
    while (start < end) {
      while (tokens[tokenIndex]!.end <= start) tokenIndex++
      const token = tokens[tokenIndex]!
      const stop = Math.min(end, token.end)
      const text = { type: 'text' as const, value: source.slice(start, stop) }
      const className = tokenClasses[tokenIndex]!
      nodes.push(className.length ? { type: 'element', tagName: 'span', properties: { className }, children: [text] } : text)
      start = stop
    }
    return nodes
  }

  if (!options.lines && ranges.length === 0) return rangeNodes(0, source.length)
  const nodes: ElementContent[] = []
  const newline = /\r\n|\r|\n/g
  let start = 0
  let number = 1
  let rangeIndex = 0
  do {
    const match = newline.exec(source)
    const end = match?.index ?? source.length
    const className = ['kirari-line', ...classes(options.lineClassName?.({ number, start, end }))]
    while (ranges[rangeIndex] && ranges[rangeIndex]![1] < number) rangeIndex++
    if (ranges[rangeIndex] && ranges[rangeIndex]![0] <= number) className.push('kirari-line-highlighted')
    nodes.push({ type: 'element', tagName: 'span', properties: { className, dataLine: number }, children: rangeNodes(start, end) })
    if (!match) break
    nodes.push({ type: 'text', value: match[0] })
    start = end + match[0].length
    if (start === source.length) break
    number++
  } while (true)
  return nodes
}
