import type { TokenPatch, TokenStream } from '../stream.js'
import type { Language, Token } from '../types.js'
import { isSignificant } from '../types.js'
import type { ResumableScan, ResumePoint } from '../resumable.js'
import { classifyDefinitions, endsLine } from '../grammars/definitions.js'
import { advanceDefinitionState, breakDefinitionLine, copyDefinitionState, createDefinitionState, isDefinitionBoundary } from '../grammars/definitions/state.js'
import type { DefinitionState } from '../grammars/definitions/state.js'

const openBrackets = (state: DefinitionState): string[] => state.brackets.map(bracket => bracket.close)

/** Advances `state` through `tokens[from..to]`, returning the next index. */
const walkDefinitions = (state: DefinitionState, tokens: readonly Token[], from: number, to: number): number => {
  for (let index = from; index <= to; index++) {
    const token = tokens[index]!
    if (isSignificant(token.type)) advanceDefinitionState(state, token)
    else if (token.type === 'text' && endsLine(token.value)) breakDefinitionLine(state)
  }
  return to + 1
}

/**
 * Streams for built-in resumable grammars rescan from the last resume point. Python then
 * reclassifies definitions from the last point where `classifyDefinitions` cannot see across.
 * Tokens before that point are final.
 */
export const createResumableStream = (language: Language, scanResumable: ResumableScan): TokenStream => {
  const classified = language.name === 'python'
  let source = ''
  let raw: Token[] = []
  let resume: ResumePoint | undefined
  let resumeIndex = 0
  // Resume points not yet decided, and the definition state through the last decided one.
  let points: { offset: number; index: number }[] = []
  let cursor = { index: 0, state: createDefinitionState() }
  let final: { offset: number; index: number; open: readonly string[] } = { offset: 0, index: 0, open: [] }
  let closed = false

  const write = (chunk: string): TokenPatch => {
    if (closed) throw new Error('Kirari: stream is closed; reset before writing again')
    if (typeof chunk !== 'string') throw new TypeError('Kirari: stream chunks must be strings')
    if (!chunk) return { from: source.length, tokens: [], length: source.length }
    const next = source + chunk
    const found: { resume: ResumePoint; index: number }[] = []
    const tail = scanResumable(next, language, resume, (point, index) => found.push({ resume: point, index: resumeIndex + index }))
    source = next
    if (!classified) {
      const from = resume?.offset ?? 0
      resume = found.at(-1)?.resume ?? resume
      return { from, tokens: tail, length: source.length }
    }
    raw.length = resumeIndex
    for (const token of tail) raw.push(token)
    points = points.filter(point => point.index < resumeIndex)
    for (const point of found) points.push({ offset: point.resume.offset, index: point.index })
    const last = found.at(-1)
    if (last) { resume = last.resume; resumeIndex = last.index }

    const from = final.offset
    const tokens = classifyDefinitions(raw.slice(final.index), language.name, final.open)
    // Tokens before the last resume point are final. A point is decided once the first significant
    // token after it is among them; its answer cannot change after that.
    let decided = 0
    for (; decided < points.length; decided++) {
      const point = points[decided]!
      let after = point.index
      while (after < resumeIndex && !isSignificant(raw[after]!.type)) after++
      if (after >= resumeIndex) break
      cursor.index = walkDefinitions(cursor.state, raw, cursor.index, point.index)
      if (isDefinitionBoundary(cursor.state, raw[after])) final = { offset: point.offset, index: point.index, open: openBrackets(cursor.state) }
    }
    // A later point waits for its next token unless it is a boundary whatever that token is.
    if (decided < points.length) {
      const state = copyDefinitionState(cursor.state)
      let index = cursor.index
      for (let pending = decided; pending < points.length; pending++) {
        const point = points[pending]!
        index = walkDefinitions(state, raw, index, point.index)
        if (isDefinitionBoundary(state, undefined)) {
          final = { offset: point.offset, index: point.index, open: openBrackets(state) }
          cursor = { index, state: copyDefinitionState(state) }
          decided = pending + 1
        }
      }
    }
    points = points.slice(decided)
    return { from, tokens, length: source.length }
  }

  return {
    mode: 'checkpoint', write,
    end(chunk = '') {
      const patch = write(chunk)
      closed = true
      return patch
    },
    reset() {
      source = ''; raw = []; resume = undefined; resumeIndex = 0; points = []
      cursor = { index: 0, state: createDefinitionState() }; final = { offset: 0, index: 0, open: [] }; closed = false
    },
  }
}
