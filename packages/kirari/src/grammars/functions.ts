import { isSignificant } from '../types.js'
import type { Token } from '../types.js'
import { lastLineBreak } from '../scanner/lexical.js'

type Result = { function: boolean; pending: boolean }
type Group = { end: number; complete: boolean }
/** Source-wide lookahead data; share only between scanners of the same immutable source. */
export interface FunctionLookupCache {
  lastLine?: number
}
export interface LookupOptions {
  /** The name follows `const`, `let`, or `var` in TypeScript, so `:` starts a type annotation. */
  readonly annotation: boolean
  /** The name may take type parameters, as after `function` or in a method position. */
  readonly generic: boolean
  /** The name is an object or class member. */
  readonly property: boolean
  /** The name is a bare `async` that may be an arrow-function modifier. */
  readonly asyncModifier: boolean
}

const closers: Record<string, string> = { '(': ')', '[': ']', '{': '}', '${': '}', '<': '>' }

/**
 * Creates a look-ahead that decides whether the name ending at `start` is a function:
 * a call or method (`name(`), a generic call (`name<T>(`), or a binding to a function
 * expression (`name = async (x) => …`, `name: function () {}`, `const name: T = x => …`).
 *
 * `pending` in the result means the look-ahead reached the end of the source, so a
 * streaming caller must treat the answer as provisional.
 */
export const createFunctionLookup = (source: string, typed: boolean, scan: (start: number) => Generator<Token, void, number | undefined>, cache: FunctionLookupCache = {}) => {
  // Reuse nested groups, including unfinished ones, instead of rescanning each signature suffix.
  const groups = new Map<number, Group>()
  return (start: number, { annotation, generic, property, asyncModifier }: LookupOptions): Result => {
    let reader = scan(start)
    let token: Token | undefined
    let limit = source.length
    let pending = false
    // Wraps an answer, marking it pending when it relied on reaching the end of the source.
    const result = (value: boolean): Result => ({ function: value, pending: pending || limit === source.length && (!token || token.end === limit && /^[=/]$/.test(token.value)) })
    const is = (value: string): boolean => token?.value === value
    // Advances `token` to the next significant token before `limit`.
    const next = (): void => {
      do {
        const value = reader.next()
        token = value.done || value.value.start >= limit ? undefined : value.value
        if (token?.type === 'operator' && /^\/=?$/.test(token.value)) {
          cache.lastLine ??= lastLineBreak(source)
          // A slash on the last line may still become a regex once more source arrives.
          pending ||= token.start > cache.lastLine
        }
      } while (token && !isSignificant(token.type))
    }
    // Restarts scanning at `position`.
    const jump = (position: number): void => { reader = scan(position); next() }
    // Consumes the bracket group opening at `token`, including `<…>` and `>>` splits; results are cached.
    const group = (): Group => {
      const opening = token!
      const cached = groups.get(opening.start)
      if (cached) { jump(cached.end); return cached }
      const angles = opening.value === '<'
      const stack: { token: Token; close: string }[] = []
      while (token) {
        const value = token.value
        if (token.type === 'punctuation' && closers[value] || angles && value === '<') {
          stack.push({ token, close: closers[value]! })
        } else if (token.type === 'punctuation' && /^[)\]}]$/.test(value) || angles && token.type === 'operator' && /^>/.test(value)) {
          // `>>` and `>>>` close one angle bracket per `>`.
          for (let index = 0; !index || value[index] === '>'; index++) {
            const frame = stack.pop()
            if (!frame || frame.close !== value[index]) {
              const failed = { end: token.start, complete: false }
              groups.set(opening.start, failed)
              return failed
            }
            const closed = { end: token.start + index + 1, complete: true }
            groups.set(frame.token.start, closed)
            if (!stack.length) { jump(closed.end); return closed }
          }
        }
        next()
      }
      const incomplete = { end: limit, complete: false }
      for (const frame of stack) groups.set(frame.token.start, incomplete)
      return incomplete
    }
    // Skips ahead to `value`, stepping over whole groups; false at a statement or block boundary.
    const until = (value: string): boolean => {
      while (token && token.value !== value) {
        if (/^[([{<]$/.test(token.value)) {
          if (!group().complete) return false
        } else if (/^[;\]}]$/.test(token.value) || is('=') && value !== '=') return false
        else next()
      }
      return token?.value === value
    }
    // Whether the current token ends the expression.
    const continuation = (): boolean => !token || /^[;,\]}]$/.test(token.value)
    // Skips a return type annotation; true when it reaches the function body `{`.
    const body = (): boolean => {
      let operand = true
      while (token) {
        if (is('{') && !operand) return true
        if (/^[([{<]$/.test(token.value)) {
          if (!group().complete) return false
          operand = false
        } else {
          if (/^[;=\]}]$/.test(token.value)) return false
          operand = /^(\||&|\?|:|=>)$/.test(token.value)
          next()
        }
      }
      return false
    }

    next()
    // Optional or definite members: `name?()`, `name!: T`.
    if (typed && generic && token && /^[?!]$/.test(token.value)) next()
    // `name(` is a call or definition; for `async (x) => …` the name is a modifier, not a function.
    if (is('(')) {
      if (!asyncModifier) return result(true)
      if (!group().complete) return result(false)
      return result(!is('=>') && !(typed && is(':')))
    }
    if (typed && is('<') && (generic || token!.start === start)) {
      if (!group().complete) return result(false)
      return result(is('('))
    }
    // Otherwise the name must be bound: `name = …`, or `name: …` for properties and annotations.
    if (!is('=') && !is(':')) return result(false)
    const colon = is(':')
    if (colon && !annotation && !property) return result(false)
    next()
    if (typed && (annotation || property) && colon && token && !/^(\(|<|async|function)$/.test(token.value)) {
      if (!until('=')) return result(false)
      next()
    }

    // Inspect the bound value; parenthesized expressions are re-entered with a narrower limit.
    while (token) {
      if (is('async')) {
        next()
        if (is('=>')) return result(true)
      }
      if (is('function')) {
        next()
        if (is('*')) next()
        if (token && /^(variable|keyword|function)$/.test(token.type)) next()
        if (typed && is('<') && !group().complete) return result(true)
        if (!is('(') || !group().complete) return result(true)
        if (typed && is(':')) { next(); if (!body()) return result(true) }
        if (!is('{') || !group().complete) return result(true)
        return result(continuation())
      }
      if (typed && is('<') && !group().complete) return result(false)
      if (is('(')) {
        const opening = token
        const closed = group()
        if (!closed.complete) return result(false)
        if (is('=>')) return result(true)
        if (typed && is(':')) { next(); return result(until('=>')) }
        if (!continuation()) return result(false)
        pending ||= !token && limit === source.length
        limit = closed.end - 1
        jump(opening.end)
        continue
      }
      if (token && /^(variable|keyword|function)$/.test(token.type)) {
        next()
        return result(is('=>'))
      }
      return result(false)
    }
    return result(false)
  }
}
