import { appendToken, cloneContext, scan, tokenize } from './tokenize.js'
import type { Frame, ScanContext } from './tokenize.js'
import { javascript } from './languages/javascript.js'
import { typescript } from './languages/typescript.js'
import { json } from './languages/json.js'
import { jsonc } from './languages/jsonc.js'
import { resumableScanOf } from './resumable.js'
import { createResumableStream } from './stream/resumable.js'
import { isSignificant } from './types.js'
import type { Language, Token } from './types.js'

export interface TokenPatch {
  /** Replace previous tokens from this UTF-16 source offset onward. */
  readonly from: number
  readonly tokens: readonly Token[]
  readonly length: number
}

export interface TokenStream {
  readonly mode: 'checkpoint' | 'full'
  write(chunk: string): TokenPatch
  end(chunk?: string): TokenPatch
  reset(): void
}

export const createTokenStream = (language: Language): TokenStream => {
  const scanResumable = resumableScanOf(language)
  if (scanResumable) return createResumableStream(language, scanResumable)
  // shortcut: long/open tails are rescanned; track more lexical state if those workloads become a bottleneck.
  const mode = !language.tokenize && (language === javascript || language === typescript || language === json || language === jsonc) ? 'checkpoint' : 'full'
  let source = ''
  let offset = 0
  let previous: Token | undefined
  let context: ScanContext = { parentheses: [] }
  let closed = false

  const write = (chunk: string): TokenPatch => {
    if (closed) throw new Error('Kirari: stream is closed; reset before writing again')
    if (typeof chunk !== 'string') throw new TypeError('Kirari: stream chunks must be strings')
    if (!chunk) return { from: source.length, tokens: [], length: source.length }
    const next = source + chunk
    if (mode === 'full') {
      const tokens = tokenize(next, language)
      source = next
      return { from: 0, tokens, length: source.length }
    }

    const from = offset
    let nextOffset = offset
    let nextPrevious = previous
    let nextContext = context
    const activeContext = cloneContext(context)
    let significant = previous
    const tokens: Token[] = []
    const frames: Frame[] = []
    for (const token of scan(next, language, offset, previous, undefined, frames, activeContext)) {
      const last = tokens.at(-1)
      // Keep names revisable until their whitespace lookahead and function signatures are resolved.
      if (token.type === 'text' && /[\r\n\u2028\u2029]/.test(token.value) && token.end < next.length && !frames.length && activeContext.functionPending === undefined) {
        nextOffset = last?.type === 'text' ? last.start : token.start
        nextPrevious = significant
        nextContext = cloneContext(activeContext)
      }
      appendToken(tokens, token)
      if (isSignificant(token.type)) significant = token
    }
    source = next
    offset = nextOffset
    previous = nextPrevious && { ...nextPrevious }
    context = nextContext
    return { from, tokens, length: source.length }
  }

  return {
    mode, write,
    end(chunk = '') {
      const patch = write(chunk)
      closed = true
      return patch
    },
    reset() { source = ''; offset = 0; previous = undefined; context = { parentheses: [] }; closed = false },
  }
}
