import { definitionsFor } from '../grammars/definitions.js'
import type { Language } from '../types.js'
import { nestedComments, whitespace, lineComment, blockComment, quotedString, tripleString, number, operator, punctuation } from '../grammars/clike.js'

export const dart: Language = {
  name: 'dart',
  definitions: definitionsFor({ arrow: '=>', typeParameters: true, parameterBodies: true, genericCalls: true }),
  tokenize: nestedComments,
  identifier: /[$_\p{ID_Start}][$\p{ID_Continue}]*/u,
  keywords: 'abstract as assert async await base break case catch class const continue covariant default deferred do dynamic else enum export extends extension external factory final finally for get hide if implements import in interface is late library mixin native new of on operator part required rethrow return sealed set show static super switch sync this throw try typedef var void when while with yield'.split(' '),
  types: 'Function bool double int num String Object Null Never List Map Set Iterable Future Stream Symbol Runes Record'.split(' '),
  booleans: ['true', 'false'],
  nulls: ['null'],
  rules: [
    whitespace, lineComment, blockComment,
    { type: 'string', pattern: /r(?:"""[\s\S]*?(?:"""|$)|'''[\s\S]*?(?:'''|$)|"[^"\r\n]*(?:"|(?=[\r\n])|$)|'[^'\r\n]*(?:'|(?=[\r\n])|$))/ },
    // shortcut: interpolation remains string text; use a parser to highlight nested expressions and their quotes.
    tripleString,
    { type: 'string', pattern: /'''(?:\\(?:[\s\S]|$)|(?!''')[^\\])*(?:'''|$)/ },
    quotedString,
    { type: 'attribute', pattern: /@[_\p{ID_Start}][\p{ID_Continue}.]*/u },
    { type: 'string', pattern: /#[_\p{ID_Start}][\p{ID_Continue}.]*/u },
    number,
    { type: 'operator', pattern: /\?\.\.|\.\.\.|~\/=?/ },
    operator, punctuation,
  ],
}
