import { escape, render, tokenClasses } from './render.js'
import type { RenderOptions, Token } from './types.js'

export type Decoration = {
  readonly start: number
  readonly end: number
  readonly className: string
}

export interface DecoratedRenderOptions extends RenderOptions {
  readonly decorations?: readonly Decoration[]
  readonly lines?: boolean
  readonly lineClassName?: (line: { readonly number: number; readonly start: number; readonly end: number }) => string | undefined
}

const splitsSurrogate = (source: string, offset: number): boolean => {
  const before = source.charCodeAt(offset - 1)
  const after = source.charCodeAt(offset)
  return before >= 0xd800 && before <= 0xdbff && after >= 0xdc00 && after <= 0xdfff
}

const assertContiguous = (tokens: readonly Token[]): void => {
  let offset = 0
  for (const token of tokens) {
    if (token.start !== offset || token.end !== offset + token.value.length) {
      throw new RangeError('Decorated tokens must cover contiguous source offsets starting at zero')
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
      throw new RangeError('Decoration offsets must be integers with 0 <= start < end <= source length')
    }
    if (splitsSurrogate(source, decoration.start) || splitsSurrogate(source, decoration.end)) {
      throw new RangeError('Decoration offsets must not split a UTF-16 surrogate pair')
    }
    if (typeof decoration.className !== 'string' || !decoration.className.trim()) {
      throw new TypeError('Decoration className must be a nonempty string')
    }
    events.push({ offset: decoration.start, index, entering: true }, { offset: decoration.end, index, entering: false })
  }
  return events.sort((a, b) => a.offset - b.offset)
}

export const renderDecorated = (tokens: readonly Token[], options: DecoratedRenderOptions = {}): string => {
  const decorations = options.decorations ?? []
  if (!options.lines && decorations.length === 0) return render(tokens, options)

  assertContiguous(tokens)
  const source = tokens.map(token => token.value).join('')
  const events = decorationEvents(decorations, source)

  // Resolve callbacks before splitting so they see each original token exactly once.
  const classesByToken = tokens.map(token => tokenClasses(token, options))
  const active = new Set<number>()
  let activeClasses = ''
  let eventIndex = 0
  let tokenIndex = 0

  const renderRange = (start: number, end: number): string => {
    const parts: string[] = []
    while (start < end) {
      while (tokens[tokenIndex]!.end <= start) tokenIndex++
      let changed = false
      while (eventIndex < events.length && events[eventIndex]!.offset <= start) {
        const event = events[eventIndex++]!
        if (event.entering) active.add(event.index)
        else active.delete(event.index)
        changed = true
      }
      if (changed) {
        activeClasses = [...active].sort((a, b) => a - b).map(index => decorations[index]!.className).join(' ')
      }
      const token = tokens[tokenIndex]!
      const stop = Math.min(end, token.end, events[eventIndex]?.offset ?? end)
      const extra = [classesByToken[tokenIndex], activeClasses].filter(Boolean).join(' ')
      parts.push(render([{ type: token.type, value: source.slice(start, stop), start, end: stop }], {
        className: () => extra,
      }))
      start = stop
    }
    return parts.join('')
  }

  // shortcut: unwrapped ranges can split CRLF; enable lines to preserve browser newline presentation.
  if (!options.lines) return renderRange(0, source.length)

  const parts: string[] = []
  const newline = /\r\n|\r|\n/g
  let start = 0
  let number = 1
  do {
    const match = newline.exec(source)
    const end = match?.index ?? source.length
    const custom = options.lineClassName?.({ number, start, end })
    const extra = custom ? ` ${escape(custom)}` : ''
    parts.push(`<span class="kirari-line${extra}" data-line="${number}">${renderRange(start, end)}</span>`)
    if (!match) break
    parts.push(match[0])
    start = end + match[0].length
    if (start === source.length) break
    number++
  } while (true)
  return parts.join('')
}
