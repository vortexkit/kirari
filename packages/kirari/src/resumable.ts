import type { ScanContext } from './tokenize.js'
import type { Language, Token } from './types.js'

export type PythonScope = { readonly value: string; readonly parent: PythonScope | undefined }

/** A root-level point where scanning can restart with the same results as a full scan. */
export type ResumePoint = {
  readonly offset: number
  readonly previous: Token | undefined
  /** Immutable Python delimiters and lambda parameter scopes shared with later checkpoints. */
  readonly brackets?: PythonScope | undefined
  /** Script scan state at the point, for grammars that embed JavaScript. */
  readonly context?: ScanContext
}

/**
 * Scans from `from` (the start when omitted) and reports each later resume point with the
 * index of the token that starts there.
 */
export type ResumableScan = (source: string, language: Language, from?: ResumePoint, checkpoint?: (point: ResumePoint, index: number) => void) => Token[]

/** Key for a built-in definition's resumable scanner. It is non-enumerable, so copies do not inherit it. */
export const resumableScan = Symbol('kirari.resumableScan')

export const resumableScanOf = (language: Language): ResumableScan | undefined => {
  return (language as { readonly [resumableScan]?: ResumableScan })[resumableScan]
}
