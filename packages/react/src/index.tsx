import type { ReactNode } from 'react'
import { tokenize } from '@vortexlabs/kirari/core'
import { javascript } from '@vortexlabs/kirari/languages/javascript'
import { renderCode } from './render.js'
import type { CodeProps } from './types.js'

export type { CodeProps, CodeText, Line, LineRange } from './types.js'

const sourceText = (children: unknown): string => {
  if (children == null || typeof children === 'boolean') return ''
  if (typeof children === 'string' || typeof children === 'number' || typeof children === 'bigint') return String(children)
  if (Array.isArray(children)) return children.map(sourceText).join('')
  throw new TypeError('Kirari: <Code> children must be text')
}

/** Highlighted code as React elements. Uses no hooks, so it also renders as a Server Component. */
export const Code = ({ children, tokens, language = javascript, ...props }: CodeProps): ReactNode => {
  return renderCode(tokens ?? tokenize(sourceText(children), language), props)
}

export type { Decoration } from '@vortexlabs/kirari/decorations'
export type { Language, Token } from '@vortexlabs/kirari/core'
