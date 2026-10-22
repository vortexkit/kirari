import type { scan } from '../../tokenize.js'
import type { Token } from '../../types.js'
import type { ResumePoint } from '../../resumable.js'

/** A stack frame scanning root code or a JavaScript expression embedded in markup. */
export type CodeState = {
  /** Selects code-token scanning rather than markup parsing. */
  kind: 'code'
  /** Script scanner using offsets into the full markup source. */
  scanner: ReturnType<typeof scan>
  /** Nested brace depth inside an expression, excluding its opening delimiter. */
  braces: number
  /** One-shot UTF-16 offset passed to the scanner after markup parsing or rollback. */
  resume?: number | undefined
  /** Last significant token, including the synthetic tag token for a completed element. */
  previous: Token | undefined
}

/** A stack frame tracking element content, an open tag, and its attribute values. */
export type MarkupState = {
  /** `value` expects a value after `=`; whitespace leaves that expectation intact. */
  kind: 'tag' | 'value' | 'text'
  /** Balance of opening and closing tags; self-closing tags leave it unchanged. */
  depth: number
  /** Whether the current tag starts with `</`. */
  closing: boolean
  /** Current tag name in its original case, or an empty string for a fragment. */
  name: string
  /** Most recently read attribute name, used to interpret its value. */
  attribute: string
  /** Lowercase `lang` value used to select an embedded template grammar. */
  language: string
  /** UTF-16 start of a closing title/textarea tag, or EOF while it is unfinished. */
  rawEnd?: number | undefined
  /** Rollback checkpoint for an adjacent JSX candidate that may instead be code. */
  sibling?: {
    /** UTF-16 offset where speculative element parsing began. */
    start: number
    /** Number of emitted tokens to preserve when reverting to code scanning. */
    tokens: number
    /** Unclosed elements, outermost first, used to detect mismatched closing tags. */
    openings: {
      /** Original, case-sensitive tag name. */
      name: string
      /** UTF-16 offset of the opening tag, also rejected when this candidate rolls back. */
      start: number
    }[]
  }
}

/** Where a JSX scan starts, and where to report root-level newlines it can resume from. */
export type MarkupResume = {
  /** Restart point in the full source; omission starts scanning at offset zero. */
  readonly from?: ResumePoint | undefined
  /** Reports safe restart points with indexes in this scan's returned token array. */
  readonly checkpoint?: ((point: ResumePoint, index: number) => void) | undefined
}
