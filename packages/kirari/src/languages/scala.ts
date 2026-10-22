import { definitionsFor } from '../grammars/definitions.js'
import type { FunctionSyntax } from '../grammars/definitions.js'
import type { Language } from '../types.js'
import { nestedComments, whitespace, lineComment, blockComment, quotedString, number, operator, punctuation } from '../grammars/clike.js'

// Function literals in braces, `{ case … => … }` and `{ x => … }`, and polymorphic `[T] => …`.
const lambda: FunctionSyntax['forms'] = (first, start, limit, { value, closing, unclosed, block }) => {
  if (first === '[') {
    const end = closing(start)
    return end !== undefined && value(end + 1) === '=>'
  }
  if (first !== '{') return undefined
  for (let cursor = start + 1; cursor < (closing(start) ?? limit); cursor++) {
    if (value(cursor) === '=>') return block(start)
    if (unclosed(cursor)) return false
    cursor = closing(cursor) ?? cursor
  }
  return false
}

export const scala: Language = {
  name: 'scala',
  definitions: definitionsFor({ declaration: /^def$/, arrow: '=>', forms: lambda, annotations: true }),
  tokenize: nestedComments,
  identifier: /[$_\p{ID_Start}][$\p{ID_Continue}]*/u,
  keywords: 'abstract as case catch class def derives do else end enum export extends extension final finally for forSome given if implicit import infix inline lazy match new object opaque open override package private protected return sealed super then this throw trait transparent try type using val var while with yield'.split(' '),
  types: 'Any AnyRef AnyVal Array Boolean Byte Char Double Float Int Long Nothing Null Short String Unit'.split(' '),
  booleans: ['true', 'false'],
  nulls: ['null'],
  rules: [
    whitespace, lineComment, blockComment,
    // shortcut: interpolation and Scala XML literals need a parser for embedded-language highlighting.
    { type: 'string', pattern: /(?:[$_\p{ID_Start}][$\p{ID_Continue}]*)?"""[\s\S]*?(?:"""|$)/u },
    { type: 'string', pattern: /[$_\p{ID_Start}][$\p{ID_Continue}]*"(?:\\(?:[\s\S]|$)|[^"\\\r\n])*(?:"|(?=[\r\n])|$)/u },
    { type: 'string', pattern: /'(?:\\(?:[\s\S]|$)|[^'\\\r\n])'/u },
    { type: 'string', pattern: /'[_\p{ID_Start}]\p{ID_Continue}*/u },
    quotedString,
    { type: 'variable', pattern: /`[^`\r\n]*(?:`|(?=[\r\n])|$)/ },
    { type: 'attribute', pattern: /@[_\p{ID_Start}][\p{ID_Continue}.]*/u },
    { type: 'number', pattern: new RegExp(`${number.pattern.source}[lLfFdD]?`) },
    { type: 'operator', pattern: /<:|>:|<%|<-|=>>|\?=>|[!#%&*+\-/:<=>?@\\^|~]+/ },
    operator, punctuation,
  ],
}
