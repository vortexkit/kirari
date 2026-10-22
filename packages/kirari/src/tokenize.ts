// Rule-based scanner shared by every language.
//
// `scan` walks the source once. At each offset it tries, in order: template text (when inside
// a template literal), a regex literal, the language rules (first match wins), a template
// opening, an identifier, and finally a single text character.
//
// State that later tokens depend on:
// - `previous` is the last significant token (not text or comment); slashes, names, and
//   JSX openings read differently depending on it.
// - `frames` tracks nesting of template literals and their `${…}` expressions.
// - `context` holds script-only lexical state (braces, parentheses, type positions) and is
//   exposed so streaming can checkpoint and resume it.
//
// Tokens produced in one step are buffered in `pending` and yielded at the start of the next.
// A consumer can call `next(offset)` to resume scanning elsewhere (markup does this after an
// embedded element); the remaining buffered tokens are then dropped.
import { isSignificant } from './types.js'
import type { Language, Token } from './types.js'
import { createFunctionLookup } from './grammars/functions.js'
import type { FunctionLookupCache } from './grammars/functions.js'
import { canStartRegex, escapedIdentifierEnd, nextVisibleChar, regexEnd, templateChunk } from './scanner/lexical.js'

export type Frame = { kind: 'template'; opening: boolean } | { kind: 'expression'; depth: number }
/** Lexical state for JavaScript-like languages, carried between scanner steps. */
export type ScanContext = {
  parentheses: { control: boolean; braces: number }[]
  braces?: number
  afterControl?: boolean
  forAwait?: boolean
  declaration?: string
  annotation?: boolean
  ternaries?: number
  functionPending?: boolean
  functionName?: boolean
  classBody?: boolean
  scopes?: boolean[]
}

export const cloneContext = (context: ScanContext): ScanContext => {
  return { ...context, parentheses: [...context.parentheses], scopes: [...context.scopes ?? []] }
}

const sticky = (pattern: RegExp): RegExp => {
  return new RegExp(pattern.source, pattern.flags.replace(/[gy]/g, '') + 'y')
}

export const tokenize = (source: string, language: Language): Token[] => {
  let tokens: Token[]
  if (language.tokenize) tokens = language.tokenize(source, language)
  else {
    tokens = []
    for (const token of scan(source, language)) appendToken(tokens, token)
  }
  return language.definitions ? language.definitions(tokens) : tokens
}

/**
 * Scans with rules, letting `override` replace tokens whose true extent rules cannot
 * express, such as nested comments or long brackets. Scanning restarts after a replacement.
 */
export const scanWithOverrides = (source: string, language: Language, override: (token: Token, previous: Token | undefined) => Token | undefined): Token[] => {
  const tokens: Token[] = []
  let previous: Token | undefined
  let scanner = scan(source, language)
  for (let item = scanner.next(); !item.done; item = scanner.next()) {
    let token = item.value
    const replacement = override(token, previous)
    if (replacement) {
      if (replacement.end !== token.end) scanner = scan(source, language, replacement.end, previous)
      token = replacement
    }
    appendToken(tokens, token)
    if (isSignificant(token.type)) previous = token
  }
  return tokens
}

/** Appends a token, merging adjacent text into one token. */
export const appendToken = (tokens: Token[], token: Token): void => {
  const last = tokens.at(-1)
  if (token.type === 'text' && last?.type === 'text') {
    tokens[tokens.length - 1] = { ...last, value: last.value + token.value, end: token.end }
  } else tokens.push(token)
}

/**
 * Yields raw tokens from `start`. Optional arguments seed state when resuming mid-source,
 * and `functions` enables look-ahead function detection (disabled inside that look-ahead).
 */
// biome-ignore lint/plugin: generators have no arrow form.
export function* scan(source: string, language: Language, start = 0, previous?: Token, failedRegexStates = new Set<number>(), frames: Frame[] = [], context: ScanContext = { parentheses: [] }, functions = true, lookupCache: FunctionLookupCache = {}): Generator<Token, void, number | undefined> {
  const rules = language.rules.map(rule => ({ type: rule.type, pattern: sticky(rule.pattern) }))
  const identifier = language.identifier && sticky(language.identifier)
  const keywords = new Set(language.keywords)
  const types = new Set(language.types)
  const booleans = new Set(language.booleans)
  const nulls = new Set(language.nulls)
  const script = language.regexLiterals && language.templates
  const typed = language.name === 'typescript' || language.name === 'tsx'
  const lookup = functions && script ? createFunctionLookup(source, typed, offset => scan(source, language, offset, undefined, failedRegexStates, [], { parentheses: [] }, false), lookupCache) : undefined
  delete context.functionPending
  let pending: Token[] = []
  let position = start

  const emit = (type: string, end: number): void => {
    const value = source.slice(position, end)
    const token = { type, value, start: position, end }
    // A `${` expression inside a template ends at its matching `}`.
    const frame = frames.at(-1)
    if (type === 'punctuation' && frame?.kind === 'expression') {
      if (value === '{') frame.depth++
      if (value === '}') {
        if (frame.depth === 0) frames.pop()
        else frame.depth--
      }
    }
    pending.push(token)
    if (isSignificant(type)) {
      if (typed) {
        // shortcut: these are lexical type positions, not binding or scope resolution.
        if (type === 'keyword' && /^(const|let|var|type)$/.test(value)) context.declaration = value === 'type' ? 'alias' : 'variable'
        if (value === '?' && nextVisibleChar(source, end) !== ':') context.ternaries = (context.ternaries ?? 0) + 1
        if (value === ':') {
          context.annotation = !context.ternaries && previous?.type !== 'property' && (context.declaration === 'variable' || context.parentheses.at(-1)?.braces === (context.braces ?? 0) || previous?.value === ')')
          if (context.ternaries) context.ternaries--
        }
        if (value === '=') {
          context.annotation = context.declaration === 'alias'
          context.declaration = ''
        }
        if (/^[;{}]$/.test(value)) { context.annotation = false; context.declaration = '' }
        if (value === ';') context.ternaries = 0
        if (type === 'keyword' && /^(as|satisfies)$/.test(value)) context.annotation = true
      }
      if (script) {
        // Braces, parentheses, and keywords that decide how later names and slashes read.
        const opensBrace = value === '{' || value === '${'
        if (opensBrace) {
          context.scopes ??= []
          context.scopes.push(!!context.classBody || expressionStart.test(previous?.value ?? ''))
          context.classBody = false
          context.braces = (context.braces ?? 0) + 1
        } else if (value === '}') {
          context.scopes?.pop()
          context.braces = Math.max(0, (context.braces ?? 0) - 1)
        }
        if (type === 'keyword' && /^(class|interface)$/.test(value)) context.classBody = true
        context.functionName = type === 'keyword' && value === 'function' || !!context.functionName && value === '*'
        if (value === '(') context.parentheses.push({ control: previous?.type === 'keyword' && controlKeyword.test(previous.value) || !!context.forAwait, braces: context.braces ?? 0 })
        context.afterControl = value === ')' && !!context.parentheses.pop()?.control
        context.forAwait = value === 'await' && previous?.type === 'keyword' && previous.value === 'for'
      }
      previous = token
    }
    position = end
  }

  const match = (pattern: RegExp): string | undefined => {
    pattern.lastIndex = position
    const result = pattern.exec(source)
    // Unicode regexes can rewind into a surrogate pair in V8.
    if (!result || result.index !== position) return undefined
    if (result[0].length === 0) {
      throw new Error(`Kirari: empty match in ${language.name} at offset ${position}`)
    }
    return result[0]
  }

  while (position < source.length) {
    for (const token of pending) {
      const resume = yield token
      if (resume !== undefined) {
        position = resume
        previous = { type: 'tag', value: 'element', start: token.start, end: resume }
        break
      }
    }
    pending = []
    if (position >= source.length) break
    const frame = frames.at(-1)
    if (frame?.kind === 'template') {
      const { end, closed } = templateChunk(source, position + (frame.opening ? 1 : 0))
      frame.opening = false
      if (closed) frames.pop()
      if (end > position) emit('string', end)
      if (source.startsWith('${', position)) {
        emit('punctuation', position + 2)
        frames.push({ kind: 'expression', depth: 0 })
      }
      continue
    }

    if (language.regexLiterals && source[position] === '/'
      && source[position + 1] !== '/' && source[position + 1] !== '*'
      && (context.afterControl || canStartRegex(previous))) {
      const end = regexEnd(source, position, failedRegexStates)
      if (end > position) {
        emit('regex', end)
        continue
      }
    }

    let matched = false
    for (const rule of rules) {
      const value = match(rule.pattern)
      if (value !== undefined) {
        emit(rule.type, position + value.length)
        matched = true
        break
      }
    }
    if (matched) continue

    const char = source[position]!
    if (language.templates && char === '`') {
      frames.push({ kind: 'template', opening: true })
      continue
    }
    let name = identifier && match(identifier)
    if (script && identifier) {
      const end = escapedIdentifierEnd(source, position, position + (name?.length ?? 0))
      if (end > position) name = source.slice(position, end)
    }
    if (name !== undefined) {
      // Classify the name; earlier branches win.
      let type = 'variable'
      const end = position + name.length
      const member = previous?.value === '.' || previous?.value === '?.'
      const method = !!context.scopes?.at(-1) && methodPrefix.test(previous?.value ?? '')
      if (member) type = 'property' // obj.name, obj?.name
      else if (typed && context.annotation && name === 'void') type = 'type' // `void` as a return type
      else if (keywords.has(name)) type = 'keyword'
      else if (booleans.has(name)) type = 'boolean'
      else if (nulls.has(name)) type = 'null'
      // Built-in types, class names, and names in TypeScript type positions.
      else if (types.has(name) || previous?.value === 'class' || typed && (context.annotation || previous?.type === 'keyword' && /^(type|interface|enum)$/.test(previous.value))) type = 'type'
      else {
        const following = nextVisibleChar(source, end)
        if (following === ':' && (previous?.value === '{' || previous?.value === ',' || typed && method && previous?.value === ';')) type = 'property' // { name: value } or TypeScript members
        else if (following === '(') type = 'function' // name(…)
      }
      // Look ahead for definitions such as `name = () => …` or `name: function () {}`.
      // `pending` means the answer depends on source that has not arrived yet (streaming).
      if (lookup && !member && (type === 'variable' || type === 'property' || context.functionName || method || /^(async|get|set|static)$/.test(name))) {
        const found = lookup(end, {
          colon: type === 'property' || method || typed && variableKeyword.test(previous?.value ?? ''),
          generic: !!context.functionName || method,
          asyncModifier: name === 'async' && !context.functionName && !method,
          decorator: previous?.value === '@',
        })
        if (found.function) type = 'function'
        if (found.pending) context.functionPending = true
      }
      context.annotation = false
      emit(type, end)
      continue
    }

    emit('text', position + 1)
  }
  yield* pending
}

const variableKeyword = /^(const|let|var)$/
const controlKeyword = /^(if|while|for|with|switch|catch)$/
const methodPrefix = /^(\{|\}|,|;|\*|async|static|get|set|public|private|protected|abstract|override)$/
// Values after which `{` opens an object literal rather than a block.
const expressionStart = /^(=|\(|\[|,|:|return|yield)$/
