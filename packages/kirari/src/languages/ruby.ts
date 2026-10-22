import { definitionsFor } from '../grammars/definitions.js'
import type { FunctionSyntax } from '../grammars/definitions.js'
import type { Language } from '../types.js'
import { whitespace, number, operator, punctuation } from '../grammars/clike.js'

const percentBody = /(?:\{(?:\\(?:[\s\S]|$)|[^}\\])*(?:\}|$)|\((?:\\(?:[\s\S]|$)|[^)\\])*(?:\)|$)|\[(?:\\(?:[\s\S]|$)|[^\]\\])*(?:\]|$)|<(?:\\(?:[\s\S]|$)|[^>\\])*(?:>|$)|([^\w\s{([<])(?:\\(?:[\s\S]|$)|(?!\1)[^\\])*(?:\1|$))/

// Stabby lambdas: `->(x) { … }` and `-> do … end`.
const stabby: FunctionSyntax['forms'] = (first, start, limit, { value, closing, block }) => {
  if (first !== '->') return undefined
  let body = start + 1
  if (value(body) === '(') body = (closing(body) ?? limit) + 1
  return value(body) === 'do' || value(body) === '{' && block(body)
}

const functions: FunctionSyntax = {
  declaration: /^def$/,
  literal: /^(lambda|proc)$/,
  literalOpener: /^(\{|do|\()$/,
  literalBody: true,
  forms: stabby,
}

export const ruby: Language = {
  name: 'ruby',
  definitions: definitionsFor(functions),
  regexLiterals: true,
  identifier: /[_\p{ID_Start}]\p{ID_Continue}*[!?]?/u,
  keywords: 'BEGIN END alias and begin break case class def defined? do else elsif end ensure for if in module next not or redo rescue retry return self super then undef unless until when while yield __ENCODING__ __FILE__ __LINE__'.split(' '),
  booleans: ['true', 'false'],
  nulls: ['nil'],
  rules: [
    whitespace,
    { type: 'comment', pattern: /#[^\r\n]*/ },
    { type: 'comment', pattern: /^=begin\b[^\r\n]*(?:\r\n|[\r\n]|$)[\s\S]*?(?:^=end\b[^\r\n]*|(?![\s\S]))/m },
    { type: 'string', pattern: /"(?:\\(?:[\s\S]|$)|[^"\\])*(?:"|$)|'(?:\\(?:[\s\S]|$)|[^'\\])*(?:'|$)|`(?:\\(?:[\s\S]|$)|[^`\\])*(?:`|$)/ },
    // shortcut: percent literals do not balance nested delimiters; use a Ruby parser for nested interpolation.
    { type: 'regex', pattern: new RegExp(`%r${percentBody.source}[imxouesn]*`) },
    { type: 'string', pattern: new RegExp(`%(?!=)[qQwWiIxs]?${percentBody.source}`) },
    { type: 'string', pattern: /:(?:[_\p{ID_Start}]\p{ID_Continue}*[!?=]?|"(?:\\(?:[\s\S]|$)|[^"\\])*(?:"|$)|'(?:\\(?:[\s\S]|$)|[^'\\])*(?:'|$))/u },
    { type: 'variable', pattern: /@@?[_\p{ID_Start}]\p{ID_Continue}*|\$(?:[_\p{ID_Start}]\p{ID_Continue}*|\d+|[^\w\s])/u },
    { type: 'type', pattern: /[\p{Lu}]\p{ID_Continue}*/u },
    { type: 'number', pattern: new RegExp(`${number.pattern.source}(?:ri?|i)?`) },
    operator, punctuation,
  ],
}
