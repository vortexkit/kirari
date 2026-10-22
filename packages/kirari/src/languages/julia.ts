import { definitionsFor } from '../grammars/definitions.js'
import { scanWithOverrides } from '../tokenize.js'
import type { Language, Token } from '../types.js'
import { whitespace, number, operator, punctuation } from '../grammars/clike.js'

const comments = (source: string, language: Language): Token[] => {
  return scanWithOverrides(source, language, token => {
    if (token.type !== 'comment' || token.value !== '#=') return undefined
    let depth = 1
    let end = token.end
    while (end < source.length && depth > 0) {
      if (source.startsWith('#=', end)) { depth++; end += 2 }
      else if (source.startsWith('=#', end)) { depth--; end += 2 }
      else end++
    }
    return { ...token, value: source.slice(token.start, end), end }
  })
}

export const julia: Language = {
  name: 'julia',
  definitions: definitionsFor({ declaration: /^(function|macro)$/, literal: /^function$/, arrow: '->' }),
  tokenize: comments,
  identifier: /[_\p{ID_Start}][\p{ID_Continue}]*(?:!(?!=))?/u,
  keywords: 'abstract baremodule begin break catch const continue do else elseif end export finally for function global if import in isa let local macro module mutable outer primitive public quote return struct try type using where while'.split(' '),
  types: 'Any Array AbstractArray AbstractString Bool Char Complex Dict Float16 Float32 Float64 Int Int8 Int16 Int32 Int64 Int128 Integer Matrix Missing Nothing Number Real Set String Symbol Tuple Type UInt UInt8 UInt16 UInt32 UInt64 UInt128 Union Vector'.split(' '),
  booleans: ['true', 'false'],
  nulls: ['nothing', 'missing'],
  rules: [
    whitespace,
    { type: 'comment', pattern: /#=/ },
    { type: 'comment', pattern: /#[^\r\n]*/ },
    // shortcut: string macros and interpolation are opaque; use a Julia parser for macro-specific semantics.
    { type: 'string', pattern: /(?:[_\p{ID_Start}]\p{ID_Continue}*)?"""(?:\\(?:[\s\S]|$)|(?!""")[^\\])*(?:"""|$)/u },
    { type: 'string', pattern: /(?:[_\p{ID_Start}]\p{ID_Continue}*)?"(?:\\(?:[\s\S]|$)|[^"\\])*(?:"|$)|`(?:\\(?:[\s\S]|$)|[^`\\])*(?:`|$)/u },
    { type: 'string', pattern: /'(?:\\(?:[uU][\da-fA-F]{1,8}|x[\da-fA-F]{1,2}|[0-7]{1,3}|[^\r\n])|[^'\\\r\n])'/u },
    { type: 'attribute', pattern: /@[_\p{ID_Start}][\p{ID_Continue}.]*/u },
    { type: 'number', pattern: /(?:Inf(?:16|32|64)?|NaN(?:16|32|64)?)\b|(?:\d[\d_]*(?:\.[\d_]*)?|\.\d[\d_]*)[fF][+-]?[\d_]+/ },
    number,
    { type: 'operator', pattern: /\.(?:[+*/^!=<>-]=?|')|===|!==|<:|>:|\/\/|[\\$'∈∉⊆⊇∪∩÷≤≥≠≈√]/ },
    operator, punctuation,
  ],
}
