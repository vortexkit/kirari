import { appendToken, cloneContext, scan, tokenize } from '../tokenize.js'
import type { Frame, ScanContext } from '../tokenize.js'
import { isSignificant } from '../types.js'
import type { Language, Token } from '../types.js'
import type { ResumePoint } from '../resumable.js'
import { canStartElement, looksLikeTag } from './markup/lookahead.js'
import { delimiterEnd, lineBreak } from '../scanner/lexical.js'
import { scanDeclaration } from './markup/declarations.js'
import type { CodeState, MarkupState, MarkupResume } from './markup/types.js'

const name = /[$_\p{ID_Start}][\p{ID_Continue}.$:-]*/uy
const attribute = /[^\s"'<>/={}]+/y
const entity = /&(?:#x[\da-f]+|#\d+|[a-z][\da-z]*);/iy
const whitespace = /\s+/y

export const markup = (source: string, code?: Language, embedded?: Readonly<Record<string, Language>>, template?: 'vue' | 'svelte', resume?: MarkupResume): Token[] => {
  const tokens: Token[] = []
  let position = resume?.from?.offset ?? 0
  const createMarkup = (): MarkupState => ({ kind: 'text', depth: 0, closing: false, name: '', attribute: '', language: '' })
  const expressionLanguage = code ?? embedded?.['script:ts'] ?? embedded?.script
  const typed = code?.name === 'tsx'
  const vue = template === 'vue'
  const svelte = template === 'svelte'
  // Expression scanners use the same source offsets; failed lookahead remains reusable.
  const failedRegexStates = new Set<number>()
  const lookupCache = {}
  const failedSiblingStarts = new Set<number>()
  const createCode = (previous?: Token, frames?: Frame[], context?: ScanContext): CodeState => ({ kind: 'code', scanner: scan(source, expressionLanguage!, position, previous, failedRegexStates, frames, context, true, lookupCache), braces: 0, previous })
  // Root script state, read at newlines outside elements to report resume points.
  const rootFrames: Frame[] = []
  const rootContext = resume?.from?.context ? cloneContext(resume.from.context) : { parentheses: [] }
  const points: { point: ResumePoint; index: number }[] = []
  // Rejected tags may become valid once more source arrives, so later resume points are dropped.
  let rewound = source.length
  const stack: (CodeState | MarkupState)[] = [code ? createCode(resume?.from?.previous, rootFrames, rootContext) : createMarkup()]

  const rejectSibling = (context: MarkupState): void => {
    const sibling = context.sibling!
    rewound = Math.min(rewound, sibling.start)
    failedSiblingStarts.add(sibling.start)
    for (const opening of sibling.openings) failedSiblingStarts.add(opening.start)
    tokens.length = sibling.tokens
    position = sibling.start
    stack.length = stack.indexOf(context)
    const parent = stack.at(-1) as CodeState
    parent.resume = position
  }

  const append = (token: Token): void => {
    appendToken(tokens, token)
    position = token.end
  }
  const emit = (type: string, end: number): void => {
    if (end > position) append({ type, value: source.slice(position, end), start: position, end })
  }
  const match = (pattern: RegExp): string | undefined => {
    pattern.lastIndex = position
    const result = pattern.exec(source)
    return result?.index === position ? result[0] : undefined
  }
  const closingTagStart = (name: string): number => {
    const closing = new RegExp(`</${name}\\s*>`, 'ig')
    closing.lastIndex = position
    return closing.exec(source)?.index ?? source.length
  }
  const appendCode = (end: number, language: Language): void => {
    const offset = position
    for (const token of tokenize(source.slice(position, end), language)) {
      append({ ...token, start: token.start + offset, end: token.end + offset })
    }
  }
  const expression = (): void => {
    emit('punctuation', position + (vue ? 2 : 1))
    if (svelte) {
      const marker = match(/[#:/@](?:if|else|each|await|then|catch|key|snippet|html|debug|const|render)\b/y)
      if (marker) emit('keyword', position + marker.length)
    }
    stack.push(createCode())
  }
  const finishTag = (context: MarkupState, selfClosing: boolean): void => {
    emit('punctuation', position + (selfClosing ? 2 : 1))
    if (selfClosing && !context.closing) context.sibling?.openings.pop()
    if (context.closing) context.depth--
    else if (!selfClosing) context.depth++
    context.kind = 'text'
    // Nested markup returns control to the code scanner that opened it.
    if (stack.length > 1 && context.depth === 0) {
      stack.pop()
      const parent = stack.at(-1) as CodeState
      parent.resume = position
      parent.previous = { type: 'tag', value: 'element', start: position, end: position }
    } else if (embedded && !context.closing && !selfClosing && /^(script|style|textarea|title)$/i.test(context.name)) {
      const end = closingTagStart(context.name)
      const name = context.name.toLowerCase()
      const key = name + (template && context.language ? `:${context.language}` : '')
      const language = Object.hasOwn(embedded, key) ? embedded[key] : undefined
      if (template && /^(title|textarea)$/.test(name)) context.rawEnd = end
      else if (language) appendCode(end, language)
      else emit('text', end)
    }
  }

  // Scans TSX type arguments such as `<Select<Item>`, splitting `>>` where the generic closes.
  const typeArguments = (): void => {
    let depth = 1
    emit('operator', position + 1)
    for (const token of scan(source, code!, position, undefined, undefined, undefined, { parentheses: [], annotation: true }, true, lookupCache)) {
      if (token.type === 'operator' && token.value === '<') depth++
      const closing = token.type === 'operator' && /^>+/.exec(token.value)
      if (closing) {
        const count = Math.min(depth, closing[0].length)
        append({ ...token, value: token.value.slice(0, count), end: token.start + count })
        depth -= count
        if (depth === 0) break
        if (count < token.value.length) append({ ...token, value: token.value.slice(count), start: token.start + count })
      } else append(token)
    }
  }

  // Advances one token inside a script expression; returns false once the scanner is exhausted.
  const stepCode = (context: CodeState): boolean => {
    const next = context.scanner.next(context.resume)
    context.resume = undefined
    if (next.done) return false
    const token = next.value
    if (resume?.checkpoint && stack.length === 1 && token.type === 'text' && lineBreak.test(token.value) && token.end < source.length && !rootFrames.length && rootContext.functionPending === undefined) {
      const last = tokens.at(-1)
      const merged = last?.type === 'text'
      points.push({ point: { offset: merged ? last.start : token.start, previous: context.previous, context: cloneContext(rootContext) }, index: merged ? tokens.length - 1 : tokens.length })
    }
    const sibling = context.previous?.type === 'tag' && !failedSiblingStarts.has(token.start)
    if (!template && token.value === '<' && (canStartElement(context.previous) || sibling)) {
      const tag = looksLikeTag(source, token.start, typed)
      if (tag === undefined) rewound = Math.min(rewound, token.start)
      if (tag) {
        position = token.start
        const element = createMarkup()
        // Accept adjacent JSX snippets only when the element closes; otherwise keep comparison operators.
        if (sibling) element.sibling = { start: position, tokens: tokens.length, openings: [] }
        stack.push(element)
        return true
      }
    }
    if (stack.length > 1 && token.type === 'punctuation') {
      if (token.value === '}' && context.braces === 0 && (!vue || source[token.end] === '}')) {
        append(token)
        if (vue) emit('punctuation', position + 1)
        stack.pop()
        return true
      }
      if (token.value === '{' || token.value === '${') context.braces++
      if (token.value === '}') context.braces--
    }
    append(token)
    if (isSignificant(token.type)) context.previous = token
    return true
  }

  // Advances inside an open tag; unmatched delimiters remain attribute text.
  const stepTag = (context: MarkupState): void => {
    const space = match(whitespace)
    if (space) {
      emit('text', position + space.length)
      return
    }
    const expectsValue = context.kind === 'value'
    const languageAttribute = expectsValue && context.attribute.toLowerCase() === 'lang'
    context.kind = 'tag'
    const char = source[position]!
    const selfClosing = (char === '/' || char === '?') && source[position + 1] === '>'
    if (selfClosing || char === '>') {
      finishTag(context, selfClosing)
      return
    }
    switch (char) {
      case '"': case "'": {
        const end = delimiterEnd(source, char, position + 1)
        const contentEnd = source[end - 1] === char && end > position + 1 ? end - 1 : end
        if (languageAttribute) context.language = source.slice(position + 1, contentEnd).toLowerCase()
        if (vue && expectsValue && /^(?:v-|[:@#])/.test(context.attribute)) {
          emit('string', position + 1)
          appendCode(contentEnd, expressionLanguage!)
          emit('string', end)
        } else emit('string', end)
        return
      }
      case '=':
        emit('operator', position + 1)
        context.kind = 'value'
        return
      case '{':
        if (!code && !svelte) break
        expression()
        return
    }
    const value = match(attribute)
    if (value && languageAttribute) context.language = value.toLowerCase()
    if (value && !expectsValue) context.attribute = value
    emit(value ? (expectsValue ? 'string' : 'attribute') : 'text', position + (value?.length ?? 1))
  }

  const openTag = (context: MarkupState): void => {
    const start = position
    context.closing = source[position + 1] === '/'
    emit('punctuation', position + (context.closing ? 2 : 1))
    const value = match(name)
    context.name = value ?? ''
    if (context.sibling) {
      if (context.closing) {
        if (context.sibling.openings.at(-1)?.name !== context.name) { rejectSibling(context); return }
        context.sibling.openings.pop()
      } else context.sibling.openings.push({ name: context.name, start })
    }
    context.attribute = ''
    context.language = ''
    if (value) emit('tag', position + value.length)
    if (typed && !context.closing && source[position] === '<') typeArguments()
    context.kind = 'tag'
  }

  // Advances through element content: text, entities, comments, nested tags, and expressions.
  const stepContent = (context: MarkupState): void => {
    const char = source[position]
    const interpolation = char === '{' && (svelte || vue && source[position + 1] === '{')
    if (context.rawEnd !== undefined && position > context.rawEnd) context.rawEnd = closingTagStart(context.name)
    if (position === context.rawEnd) context.rawEnd = undefined
    if (context.rawEnd !== undefined) {
      if (interpolation) {
        expression()
        return
      }
      let end = position + 1
      while (end < context.rawEnd && source[end] !== '{') end++
      emit('text', end)
      return
    }
    switch (char) {
      case '<': {
        if (scanDeclaration(source, position, emit)) return
        if (looksLikeTag(source, position, typed)) {
          openTag(context)
          return
        }
        break
      }
      case '{':
        if (!code && !interpolation) break
        expression()
        return
    }
    const value = match(entity)
    if (value) {
      emit('entity', position + value.length)
      return
    }
    let end = position + 1
    while (end < source.length && !/[<&]/.test(source[end]!) && !((code || template) && source[end] === '{')) end++
    emit('text', end)
  }

  while (stack.length) {
    if (position >= source.length) {
      let pending: MarkupState | undefined
      for (const context of stack) {
        if (context.kind !== 'code' && context.sibling) pending = context
      }
      if (!pending) break
      rejectSibling(pending)
    }
    const context = stack.at(-1)!
    if (context.kind === 'code') {
      if (!stepCode(context)) break
    } else if (context.kind === 'text') stepContent(context)
    else stepTag(context)
  }
  for (const { point, index } of points) if (point.offset < rewound) resume!.checkpoint!(point, index)
  return tokens
}
