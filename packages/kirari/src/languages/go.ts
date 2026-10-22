import { definitionsFor } from '../grammars/definitions.js'
import type { FunctionSyntax } from '../grammars/definitions.js'
import type { Language } from '../types.js'
import { identifier, whitespace, lineComment, blockComment, quotedString, number, operator, punctuation } from '../grammars/clike.js'

const functions: FunctionSyntax = {
  declaration: /^func$/,
  literal: /^func$/,
  literalBody: true,
  typeBodies: /^(struct|interface)$/,
  varAnnotations: true,
  assignment: /^(=|:=)$/,
}

export const go: Language = {
  name: 'go',
  definitions: definitionsFor(functions),
  identifier,
  keywords: 'break case chan const continue default defer else fallthrough for func go goto if import interface map package range return select struct switch type var'.split(' '),
  types: 'any bool byte comparable complex64 complex128 error float32 float64 int int8 int16 int32 int64 rune string uint uint8 uint16 uint32 uint64 uintptr'.split(' '),
  booleans: ['true', 'false'],
  nulls: ['nil'],
  rules: [
    whitespace, lineComment, blockComment,
    { type: 'string', pattern: /`[^`]*(?:`|$)/ },
    quotedString,
    { type: 'number', pattern: new RegExp(`${number.pattern.source}i?`) },
    { type: 'operator', pattern: /:=|<-|&\^=?/ },
    operator, punctuation,
  ],
}
