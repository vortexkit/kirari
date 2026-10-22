/** Built-in token categories; custom languages may emit additional names. */
export const tokenTypes = [
  'text', 'keyword', 'variable', 'property', 'function', 'string', 'number',
  'boolean', 'null', 'comment', 'operator', 'punctuation', 'type', 'regex',
  'inserted', 'deleted', 'heading', 'tag', 'attribute', 'entity',
] as const

/** A built-in category. `Token.type` also accepts custom categories. */
export type TokenType = (typeof tokenTypes)[number]

/** Whether a token type affects how later tokens read; whitespace and comments do not. */
export const isSignificant = (type: string): boolean => type !== 'text' && type !== 'comment'

/** An unchanged source slice with UTF-16 offsets into the original source. */
export type Token = {
  /** Category used for the `kirari-${type}` CSS class; custom names are supported. */
  readonly type: string
  /** Exact source text between `start` and `end`. */
  readonly value: string
  /** Inclusive UTF-16 offset. */
  readonly start: number
  /** Exclusive UTF-16 offset. */
  readonly end: number
}

/** A lexical rule tried at the current source offset; the first matching rule wins. */
export type Rule = {
  /** Category assigned to the matched source text. */
  readonly type: string
  /** Cloned with `g`/`y` replaced by sticky `y`; supplied `lastIndex` is untouched. Empty matches throw. */
  readonly pattern: RegExp
}

/** Scanner rules and optional structural processing for a language. */
export type Language = {
  /** Language identifier used by diagnostics and grammar-specific scanning. */
  readonly name: string
  /** Ordered lexical rules used by the default scanner. */
  readonly rules: readonly Rule[]
  /** Replaces the default scanner; returns tokens covering the source contiguously from offset zero. */
  readonly tokenize?: (source: string, language: Language) => Token[]
  /** Post-processes scanned tokens. When resuming, `open` lists enclosing closing delimiters, outermost first. */
  readonly definitions?: (tokens: Token[], open?: readonly string[]) => Token[]
  /** Pattern enabling identifier classification; unmatched characters remain `text` when omitted. */
  readonly identifier?: RegExp
  /** Exact identifier spellings classified as keywords. */
  readonly keywords?: readonly string[]
  /** Exact identifier spellings classified as built-in types. */
  readonly types?: readonly string[]
  /** Exact identifier spellings classified as boolean literals. */
  readonly booleans?: readonly string[]
  /** Exact identifier spellings classified as null-like literals. */
  readonly nulls?: readonly string[]
  /** Enables JavaScript-style template literals and `${…}` expressions. Defaults to `false`. */
  readonly templates?: boolean
  /** Enables context-sensitive JavaScript-style regex literals. Defaults to `false`. */
  readonly regexLiterals?: boolean
}

/** Extra CSS classes added alongside the renderer's standard token classes. */
export type RenderOptions = {
  /** Additional classes by token category, including custom categories. */
  readonly classes?: Readonly<Record<string, string>>
  /** Additional classes per token, combined with `classes`; `undefined` adds nothing. */
  readonly className?: (token: Token) => string | undefined
}

/** Language selection and token styling for `highlight`. */
export interface HighlightOptions extends RenderOptions {
  /** Language used to tokenize the source. Defaults to JavaScript. */
  readonly language?: Language
}
