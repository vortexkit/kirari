// Function classification for languages without a dedicated scanner pass.
//
// After a language is lexed, `classifyDefinitions` visits each name and marks it as a function
// when it is declared (`def name`), called (`name(`), or bound to a function literal
// (`name = fn …`). The algorithm is shared; each language describes how it writes functions
// with a `FunctionSyntax` in its own definition file.
import { isSignificant } from '../types.js'
import type { Token } from '../types.js'

export const pairs: Record<string, string> = { '(': ')', '[': ']', '{': '}', '#(': ')', '@(': ')', '@{': '}' }
export const memberAccess = /^(\.|\?\.|->|\?->|::)$/
const qualifier = /^(\.|:)$/

/** Bracket structure of the significant tokens being classified, for `FunctionSyntax` hooks. */
export type Structure = {
  /** Value of the significant token at `index`, or `''` outside the tokens. */
  value(index: number): string
  /** Index of the bracket closing the one that opens at `index`. */
  closing(index: number): number | undefined
  /** Index of the innermost bracket enclosing `index`; `-1` for one opened before these tokens. */
  parent(index: number): number | undefined
  /** Whether `index` opens a bracket that does not close within these tokens. */
  unclosed(index: number): boolean
  /** Whether the group opening at `start` is a body, not a value that is then called or indexed. */
  block(start: number): boolean
}

/** How a language writes functions. Everything is optional; an empty syntax detects only calls. */
export type FunctionSyntax = {
  /** Keyword before a declared name: `def` in `def name`. */
  readonly declaration?: RegExp
  /** Keyword that starts a function literal: `lambda`, `func`, `fun`. */
  readonly literal?: RegExp
  /** Token required right after the `literal` keyword: Ruby `lambda {` and `proc do`. */
  readonly literalOpener?: RegExp
  /** A literal's body must not be invoked at once: `func () { … }()` is a call result, not a function. */
  readonly literalBody?: boolean
  /** Keywords whose `{ … }` is a type body, not a literal body: Go `struct` and `interface`. */
  readonly typeBodies?: RegExp
  /** Modifiers that may precede a literal: Rust `async move |x|`. */
  readonly modifiers?: RegExp
  /** Arrow of lambdas such as `(x) => …` and `x -> …`. */
  readonly arrow?: '=>' | '->'
  /** Type parameters may precede lambda parameters: Dart `<T>(x) => …`. */
  readonly typeParameters?: boolean
  /** Lambda parameters may be followed by a modifier and a block body: Dart `(x) async { … }`. */
  readonly parameterBodies?: boolean
  /** Other function literal forms; returns `undefined` when `first` starts none of them. */
  readonly forms?: (first: string, start: number, limit: number, structure: Structure) => boolean | undefined
  /** `<` and `>` are always comparison operators, never generic brackets: Python. */
  readonly comparisonAngles?: boolean
  /** Generic calls such as `name<T>(…)`. */
  readonly genericCalls?: boolean
  /** Calls are written `(name …)`, so `name(` is not one: Clojure. */
  readonly prefixCalls?: boolean
  /** Names with a `$` or `@` sigil can be called: C# verbatim identifiers such as `@class(`. */
  readonly sigilCalls?: boolean
  /** Bindings may be annotated: `name: T = …`. */
  readonly annotations?: boolean
  /** Variable declarations may be annotated: Go `var name T = …`. */
  readonly varAnnotations?: boolean
  /** An annotation outside brackets ends at a line break: Python. */
  readonly lineAnnotations?: boolean
  /** Assignment operators for bindings. Defaults to `=`. */
  readonly assignment?: RegExp
  /** Other positions that bind the name at `index` to the following value: Clojure `(def name …)`. */
  readonly binding?: (index: number, structure: Structure) => boolean
  /** A decorator name at the start of a logical line is a function: Python `@name`. */
  readonly decorators?: boolean
}

/** `{ … }` closures that are not invoked at once, as in Kotlin and Swift. */
export const braceClosure: NonNullable<FunctionSyntax['forms']> = (first, start, _limit, structure) => {
  return first === '{' ? structure.block(start) : undefined
}

/**
 * Indexes bracket structure over significant tokens: `closes` maps an opening index to its
 * closing index (including `<…>` generics), `opens` maps a closing `>` back, and `parents`
 * maps each token to its innermost enclosing bracket. `open` lists the closing values of
 * brackets opened before `parts`, outermost first; tokens inside them get the parent `-1`.
 * Without `generics`, `<` and `>` stay comparison operators.
 */
const matchBrackets = (parts: readonly Token[], open: readonly string[], generics: boolean) => {
  const closes = new Map<number, number>()
  const opens = new Map<number, number>()
  const parents = new Map<number, number>()
  const stack: { index: number; close: string }[] = open.map(close => ({ index: -1, close }))
  const angles: number[] = []
  for (let index = 0; index < parts.length; index++) {
    const token = parts[index]!
    if (stack.length) parents.set(index, stack.at(-1)!.index)
    if (token.type === 'punctuation') {
      if (pairs[token.value]) stack.push({ index, close: pairs[token.value]! })
      else if (token.value === stack.at(-1)?.close) {
        const opening = stack.pop()!.index
        if (opening >= 0) closes.set(opening, index)
      }
    }
    if (!generics) continue
    if (token.type === 'operator' && token.value === '<') angles.push(index)
    else if (token.type === 'operator' && /^>+$/.test(token.value)) {
      for (const _ of token.value) if (angles.length) {
        const opening = angles.pop()!
        closes.set(opening, index)
        opens.set(index, opening)
      }
    } else if (/^[;{}]$/.test(token.value)) angles.length = 0
  }
  return { closes, opens, parents }
}

// Classify after grammar-specific lexing so quoted names work and opaque literals stay opaque.
// Streams pass `open` when `tokens` start inside brackets.
export const classifyDefinitions = (tokens: Token[], syntax: FunctionSyntax, open: readonly string[] = []): Token[] => {
  const positions: number[] = []
  const parts = tokens.filter((token, index) => {
    if (!isSignificant(token.type)) return false
    positions.push(index)
    return true
  })
  const { closes, opens, parents } = matchBrackets(parts, open, !syntax.comparisonAngles)
  const lineBreakBefore = (index: number): boolean => {
    for (let at = positions[index - 1]! + 1; at < positions[index]!; at++) if (endsLine(tokens[at]!.value)) return true
    return false
  }
  const value = (index: number): string => parts[index]?.value ?? ''
  const invoked = (end: number): boolean => /^(\(|\[|\.|\?\.|::)$/.test(value(end + 1))
  const block = (start: number): boolean => {
    const end = closes.get(start)
    return end === undefined || !invoked(end)
  }
  const unclosed = (index: number): boolean => !!pairs[value(index)] && !closes.has(index)
  const structure: Structure = {
    value,
    closing: index => closes.get(index),
    parent: index => parents.get(index),
    unclosed,
    block,
  }
  const { arrow } = syntax

  // A literal introduced by a keyword such as `func`, `fun`, `lambda`, or `delegate`.
  const keywordLiteral = (start: number, limit: number): boolean => {
    if (syntax.literalOpener && !syntax.literalOpener.test(value(start + 1))) return false
    // shortcut: recognize explicit literals, not inferred aliases or results of arbitrary expressions.
    if (!syntax.literalBody) return true
    for (let cursor = start + 1; cursor < limit; cursor++) {
      if (value(cursor) === '{' && !syntax.typeBodies?.test(value(cursor - 1))) return block(cursor)
      if (/^(;|=|:=|=>|do|end)$/.test(value(cursor))) break
      if (unclosed(cursor)) return true
      cursor = closes.get(cursor) ?? cursor
    }
    return true
  }

  // `(params) => …`, or with parameter bodies `(params) async { … }`. Undefined when parentheses
  // that are not invoked may just group the literal, as in `(x => x)`.
  const parameters = (end: number): boolean | undefined => {
    if (arrow && value(end + 1) === arrow) return true
    if (!syntax.parameterBodies) return undefined
    let body = end + 1
    if (value(body) === 'async' || value(body) === 'sync') {
      body++
      if (value(body) === '*') body++
    }
    if (value(body) === '=>') return true
    if (value(body) === '{') return block(body)
    return undefined
  }

  // Whether the expression starting at `start` is a function literal.
  const literal = (start: number, limit = parts.length): boolean => {
    while (start < limit) {
      const first = value(start)
      if (syntax.modifiers?.test(first)) {
        start++
        continue
      }
      const form = syntax.forms?.(first, start, limit, structure)
      if (form !== undefined) return form
      if (syntax.literal?.test(first)) return keywordLiteral(start, limit)
      if (first === '<' && syntax.typeParameters) {
        const end = closes.get(start)
        if (end === undefined) return false
        start = end + 1
        continue
      }
      if (first === '(') {
        const end = closes.get(start)
        if (end === undefined || end >= limit) return false
        const lambda = parameters(end)
        if (lambda !== undefined) return lambda
        if (invoked(end)) return false
        // Look inside the parentheses.
        limit = end
        start++
        continue
      }
      // `x => …` with a single unparenthesized parameter.
      return !!arrow && /^(variable|keyword)$/.test(parts[start]?.type ?? '') && value(start + 1) === arrow
    }
    return false
  }

  // Qualified declarations such as `def self.name` or `function obj:name` record each
  // qualifier so the final segment still counts as declared.
  const qualifiers = new Set<number>()
  const declared = (index: number): boolean => {
    // Find the token before the name, skipping a `*`/`&` marker and type parameters (`fun <T> name`).
    let before = index - 1
    if (value(before) === '*' || value(before) === '&') before--
    if (opens.has(before)) before = opens.get(before)! - 1
    const followsDeclaration = !!syntax.declaration?.test(value(before))
      || qualifier.test(value(before)) && qualifiers.has(before - 1)
    if (!followsDeclaration) return false
    const qualifierEnd = value(index + 1) === '<' ? closes.get(index + 1) ?? index : index
    if (!qualifier.test(value(qualifierEnd + 1))) return true
    qualifiers.add(qualifierEnd)
    return false
  }

  // Decorators start a logical line outside brackets; matrix multiplication does not.
  const decorated = (index: number): boolean => {
    if (!syntax.decorators || value(index - 1) !== '@' || value(index + 1) === '.') return false
    const startsLine = index === 1 || lineBreakBefore(index - 1)
    return !lineBreakBefore(index) && !parents.has(index - 1) && startsLine
  }

  // Calls: `name(` and generic `name<T>(`.
  const called = (index: number): boolean => {
    const token = parts[index]!
    if (syntax.prefixCalls || /^[$@]/.test(token.value) && !syntax.sigilCalls) return false
    const next = index + 1
    if (value(next) === '(') return true
    if (value(next) !== '<' || !syntax.genericCalls) return false
    const adjacent = parts[next]?.start === token.end || /^(type|variable)$/.test(parts[index - 1]?.type ?? '')
    return adjacent && value((closes.get(next) ?? parts.length) + 1) === '('
  }

  // The index of the `=` after a type annotation, or of where the annotation scan stopped.
  const skipAnnotation = (index: number): number => {
    let next = index + 1
    while (++next < parts.length) {
      if (syntax.lineAnnotations && !parents.has(index) && lineBreakBefore(next)) return -1
      if (value(next) === '=') break
      if (/^[;{},):\]]$/.test(value(next)) || /^(val|var|let|def)$/.test(value(next))) break
      if (unclosed(next)) break
      next = closes.get(next) ?? next
    }
    return next
  }

  // Bindings to function literals: `name = fn …`, `name: T = fn …`.
  const bound = (index: number): boolean => {
    const annotated = syntax.annotations && value(index + 1) === ':'
      || syntax.varAnnotations && value(index - 1) === 'var' && value(index + 1) !== '='
    const next = annotated ? skipAnnotation(index) : index + 1
    const assignment = syntax.assignment ? syntax.assignment.test(value(next)) : value(next) === '='
    if (assignment && literal(next + 1)) return true
    return !!syntax.binding?.(index, structure) && literal(next)
  }

  for (let index = 0; index < parts.length; index++) {
    const token = parts[index]!
    if (!/^(variable|property|type|function|keyword)$/.test(token.type)) continue
    const isDeclared = declared(index)
    if (!isDeclared && token.type !== 'variable' && token.type !== 'property') continue
    const member = memberAccess.test(value(index - 1))
    if (isDeclared || decorated(index) || !member && (called(index) || bound(index))) {
      tokens[positions[index]!] = { ...token, type: 'function' }
    }
  }
  return tokens
}

/** A `Language.definitions` callback that classifies functions written with `syntax`. */
export const definitionsFor = (syntax: FunctionSyntax) => {
  return (tokens: Token[], open?: readonly string[]): Token[] => classifyDefinitions(tokens, syntax, open)
}

/** Whether text contains a newline that is not a backslash line continuation. */
export const endsLine = (text: string): boolean => /[\r\n]/.test(text.replace(/\\(?:\r\n|\r|\n)/g, ''))
