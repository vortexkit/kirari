import type { ComponentPropsWithoutRef } from 'react'
import type { Language, Token } from '@vortexlabs/kirari/core'
import type { Decoration } from '@vortexlabs/kirari/decorations'

/** A one-based line number or an inclusive pair of line numbers. */
export type LineRange = number | readonly [first: number, last: number]

/** A rendered source line; CRLF, CR, and LF separators sit outside its wrapper. */
export type Line = {
  /** One-based line number. */
  readonly number: number
  /** Inclusive UTF-16 offset into the complete source. */
  readonly start: number
  /** Exclusive UTF-16 offset; excludes any line separator. */
  readonly end: number
}

/** Text children, joined like React text: `null`, `undefined`, and booleans render nothing. */
export type CodeText = string | number | bigint | boolean | null | undefined | readonly CodeText[]

/** Highlighted code options; remaining native props are forwarded to the `<pre>` element. */
export interface CodeProps extends Omit<ComponentPropsWithoutRef<'pre'>, 'children'> {
  /** Source to highlight. Ignored when `tokens` is set. */
  readonly children?: CodeText
  /** Pre-scanned tokens covering contiguous source offsets from zero; overrides `children` and `language`. */
  readonly tokens?: readonly Token[]
  /** Language used to tokenize `children`. Defaults to JavaScript. */
  readonly language?: Language
  /** Additional classes by token category, combined with the standard `kirari-*` classes. */
  readonly classes?: Readonly<Record<string, string>>
  /** Additional classes, resolved once per original token before line or decoration splits. */
  readonly tokenClassName?: (token: Token) => string | undefined
  /** Source ranges receiving extra classes; offsets must be valid UTF-16 boundaries. */
  readonly decorations?: readonly Decoration[]
  /** Wrap each line in `<span class="kirari-line" data-line="n">`. Defaults to `false`. */
  readonly lines?: boolean
  /** Additional classes per rendered line; used when `lines` or nonempty `highlightLines` enables wrappers. */
  readonly lineClassName?: (line: Line) => string | undefined
  /** One-based lines or inclusive ranges that receive `kirari-line-highlighted`. Implies `lines`. */
  readonly highlightLines?: readonly LineRange[]
}
