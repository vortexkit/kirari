import { braceClosure, definitionsFor } from '../grammars/definitions.js'
import type { Language } from '../types.js'
import { nestedComments, identifier, whitespace, lineComment, blockComment, quotedString, number, operator, punctuation } from '../grammars/clike.js'

export const kotlin: Language = {
  name: 'kotlin',
  definitions: definitionsFor({ declaration: /^fun$/, literal: /^fun$/, literalBody: true, forms: braceClosure, annotations: true }),
  tokenize: nestedComments,
  identifier,
  keywords: 'actual abstract annotation as break by catch class companion const constructor context continue crossinline data delegate do dynamic else enum expect external field file final finally for fun get if import in infix init inline inner interface internal is lateinit noinline object open operator out override package param private property protected public receiver reified return sealed set setparam super suspend tailrec this throw try typealias typeof val value var vararg when where while'.split(' '),
  types: 'Any Array Boolean Byte Char Double Float Int Long Nothing Number Short String Unit UByte UInt ULong UShort'.split(' '),
  booleans: ['true', 'false'],
  nulls: ['null'],
  rules: [
    whitespace, lineComment, blockComment,
    { type: 'string', pattern: /"""[\s\S]*?(?:"""|$)/ },
    quotedString,
    { type: 'variable', pattern: /`[^`\r\n]*(?:`|$)/ },
    { type: 'attribute', pattern: /@[_\p{ID_Start}][\p{ID_Continue}.]*(?::[_\p{ID_Start}][\p{ID_Continue}.]*)?/u },
    { type: 'number', pattern: new RegExp(`${number.pattern.source}(?:[uU][lL]?|[lLfF])?`) },
    { type: 'operator', pattern: /===|!==|!!|\?:|!in\b|!is\b|as\?|\.\.</ },
    operator, punctuation,
  ],
}
