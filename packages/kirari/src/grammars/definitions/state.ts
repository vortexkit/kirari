import type { Token } from '../../types.js'
import { pairs } from '../definitions.js'

const memberAccess = /^(\.|\?\.|->|\?->|::)$/
const nameType = /^(variable|property|type|function|keyword|boolean|null)$/
const backReference = /^(def|\*|&|\.|:|\?\.|->|\?->|::|>+)$/

/**
 * Significant-token state before a point in Python source, tracked so a stream can tell when
 * `classifyDefinitions` results before that point no longer depend on later tokens.
 */
export interface DefinitionState {
  /** Open brackets, as in `matchBrackets`, with the value before each opening. */
  brackets: { close: string; before: string }[]
  /** Bracket depths of `name:` annotation scans that have not reached `=` or a stop token. */
  annotations: number[]
  /** The last three significant tokens, oldest first. */
  recent: Token[]
  /** For a token that closed a bracket, the value before its opening. */
  closed: string | undefined
}

export const createDefinitionState = (): DefinitionState => {
  return { brackets: [], annotations: [], recent: [], closed: undefined }
}

export const copyDefinitionState = (state: DefinitionState): DefinitionState => {
  return { ...state, brackets: [...state.brackets], annotations: [...state.annotations], recent: [...state.recent] }
}

/** Ends top-level annotation scans at a logical line break, as `classifyDefinitions` does. */
export const breakDefinitionLine = (state: DefinitionState): void => {
  if (!state.brackets.length) state.annotations = state.annotations.filter(level => level !== 0)
}

/** Advances `state` past one significant token. */
export const advanceDefinitionState = (state: DefinitionState, token: Token): void => {
  const value = token.value
  const p1 = state.recent.at(-1)
  const p2 = state.recent.at(-2)
  const depth = state.brackets.length
  state.annotations = state.annotations.filter(level => level !== depth || !/^([;{},):\]=]|val|var|let|def)$/.test(value))
  // Declared names are functions whatever follows, so only variables and properties start a scan.
  if (value === ':' && (p1?.type === 'variable' || p1?.type === 'property') && !memberAccess.test(p2?.value ?? '')) state.annotations.push(depth)
  state.closed = undefined
  if (token.type === 'punctuation') {
    if (pairs[value]) state.brackets.push({ close: pairs[value]!, before: p1?.value ?? '' })
    else if (value === state.brackets.at(-1)?.close) state.closed = state.brackets.pop()!.before
  }
  state.recent.push(token)
  if (state.recent.length > 3) state.recent.shift()
}

/**
 * Whether Python definitions on each side of this point classify the same as in the whole
 * source: no function literal's parentheses or annotation spans it, and the tokens
 * just before it cannot look ahead past `next` or be looked back to as a declaration, qualifier,
 * or member access. `next` is the first significant token after the point, once it is final.
 */
export const isDefinitionBoundary = (state: DefinitionState, next: Token | undefined): boolean => {
  if (state.annotations.length) return false
  if (state.brackets.some(bracket => bracket.close === ')' && /^(=|:=)$/.test(bracket.before))) return false
  const [p3, p2, p1] = [undefined, undefined, undefined, ...state.recent].slice(-3)
  if (!p1) return true
  if ((p1.type === 'variable' || p1.type === 'property') && (!next || /^(:|=)$/.test(next.value))) return false
  if (/^(=|:=|<)$/.test(p1.value)) return false
  // A name after the point, or one reached by skipping `*` or `&`, would look back at `p1`.
  if (backReference.test(p1.value) && p1.value !== ':' && (!next || nameType.test(next.type) || /^[*&]$/.test(next.value))) return false
  // A declared name followed by `.`, `:`, or `<` is a qualifier instead.
  if (nameType.test(p1.type) && backReference.test(p2?.value ?? '') && (!next || /^(\.|:|<)$/.test(next.value))) return false
  if (p1.value === ':' && p2 && nameType.test(p2.type) && backReference.test(p3?.value ?? '')) return false
  if (/^[)\]}]$/.test(p1.value) && /^(=|:=)$/.test(state.closed ?? '') && !next) return false
  return true
}
