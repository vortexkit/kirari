'use client'

import { useCallback, useMemo, useState } from 'react'
import type { Language, Token } from '@vortexlabs/kirari/core'
import { createTokenStream } from '@vortexlabs/kirari/stream'
import type { TokenPatch, TokenStream } from '@vortexlabs/kirari/stream'

export type StreamedTokens = {
  readonly tokens: readonly Token[]
  write(chunk: string): void
  end(chunk?: string): void
  reset(): void
}

export const applyPatch = (tokens: readonly Token[], patch: TokenPatch): readonly Token[] => {
  return [...tokens.filter(token => token.end <= patch.from), ...patch.tokens]
}

/** Tokens for source that arrives in chunks. Pass the result's `tokens` to `<Code tokens>`. */
export const useTokenStream = (language: Language): StreamedTokens => {
  const stream = useMemo(() => createTokenStream(language), [language])
  const [snapshot, setSnapshot] = useState<{ stream: TokenStream; tokens: readonly Token[] }>({ stream, tokens: [] })
  // A new language starts a new stream; tokens from the previous one no longer apply.
  if (snapshot.stream !== stream) setSnapshot({ stream, tokens: [] })

  const apply = useCallback((patch: TokenPatch) => {
    setSnapshot(previous => previous.stream === stream ? { stream, tokens: applyPatch(previous.tokens, patch) } : previous)
  }, [stream])
  const write = useCallback((chunk: string) => apply(stream.write(chunk)), [stream, apply])
  const end = useCallback((chunk?: string) => apply(stream.end(chunk)), [stream, apply])
  const reset = useCallback(() => {
    stream.reset()
    setSnapshot({ stream, tokens: [] })
  }, [stream])

  return { tokens: snapshot.stream === stream ? snapshot.tokens : [], write, end, reset }
}
