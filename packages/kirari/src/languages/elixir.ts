import { definitionsFor } from '../grammars/definitions.js'
import type { FunctionSyntax } from '../grammars/definitions.js'
import type { Language } from '../types.js'
import { whitespace } from '../grammars/clike.js'

const quoted = /"(?:\\(?:[\s\S]|$)|[^"\\])*(?:"|$)|'(?:\\(?:[\s\S]|$)|[^'\\])*(?:'|$)/
const heredoc = /"""(?:\\(?:[\s\S]|$)|(?!""")[^\\])*(?:"""|$)|'''(?:\\(?:[\s\S]|$)|(?!''')[^\\])*(?:'''|$)/
const delimited = /\((?:\\(?:[\s\S]|$)|[^)\\])*(?:\)|$)|\[(?:\\(?:[\s\S]|$)|[^\]\\])*(?:\]|$)|\{(?:\\(?:[\s\S]|$)|[^}\\])*(?:\}|$)|<(?:\\(?:[\s\S]|$)|[^>\\])*(?:>|$)|([/|])(?:\\(?:[\s\S]|$)|(?!\1)[^\\])*(?:\1|$)/
const sigil = new RegExp(`(?:${heredoc.source}|${quoted.source}|${delimited.source})[a-zA-Z0-9]*`)

// Captures: `&(&1 + 1)` and `&Module.fun/1`.
const capture: FunctionSyntax['forms'] = first => first === '&' ? true : undefined

const functions: FunctionSyntax = {
  declaration: /^(defp?|defmacro[p]?|defguard[p]?|defdelegate)$/,
  literal: /^fn$/,
  forms: capture,
}

export const elixir: Language = {
  name: 'elixir',
  definitions: definitionsFor(functions),
  identifier: /[_\p{ID_Start}]\p{ID_Continue}*[!?]?/u,
  keywords: 'after alias and case catch cond def defdelegate defexception defguard defguardp defimpl defmacro defmacrop defmodule defp defprotocol defstruct do else end fn for if import in not or quote raise receive require rescue reraise super throw try unless unquote unquote_splicing use when with'.split(' '),
  booleans: ['true', 'false'],
  nulls: ['nil'],
  rules: [
    whitespace,
    { type: 'comment', pattern: /#[^\r\n]*/ },
    // shortcut: interpolation stays opaque and sigils stop at the first unescaped delimiter; use a parser for nested expressions.
    { type: 'regex', pattern: new RegExp(`~[rR]${sigil.source}`) },
    { type: 'string', pattern: new RegExp(`~(?:[a-z]|[A-Z][A-Z0-9]*)${sigil.source}`) },
    { type: 'string', pattern: heredoc },
    { type: 'string', pattern: quoted },
    { type: 'string', pattern: new RegExp(`:(?:[_\\p{ID_Start}][\\p{ID_Continue}@]*[!?]?|${quoted.source}|[+*/<>=!&|^-]+)`, 'u') },
    { type: 'property', pattern: /[_\p{ID_Start}]\p{ID_Continue}*[!?]?(?=:(?!:))/u },
    { type: 'attribute', pattern: /@[_\p{ID_Start}]\p{ID_Continue}*[!?]?/u },
    { type: 'type', pattern: /[A-Z][a-zA-Z0-9_]*(?:\.[A-Z][a-zA-Z0-9_]*)*/ },
    { type: 'number', pattern: /\?(?:\\(?:u\{[\da-fA-F]+\}|u[\da-fA-F]{4}|x[\da-fA-F]{2}|[\s\S])|[^\s])|0[xX][\da-fA-F_]+|0[bB][01_]+|0[oO][0-7_]+|\d[\d_]*(?:\.\d[\d_]*(?:[eE][+-]?[\d_]+)?)?/u },
    { type: 'operator', pattern: /===|!==|<<<|>>>|~~~|&&&|\|\|\||\^\^\^|<<|>>|\\\\|\|>|<-|->|=>|::|\.\.|\+\+|--|<>|&&|\|\||[=!<>]=|[+*/=<>!&|^%-]/ },
    { type: 'punctuation', pattern: /[{}()[\],;:.]/ },
  ],
}
