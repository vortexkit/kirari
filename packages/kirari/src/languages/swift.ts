import { braceClosure, definitionsFor } from '../grammars/definitions.js'
import type { Language } from '../types.js'
import { nestedComments, identifier, whitespace, lineComment, blockComment, tripleString, doubleString, number, operator, punctuation } from '../grammars/clike.js'

export const swift: Language = {
  name: 'swift',
  definitions: definitionsFor({ declaration: /^func$/, forms: braceClosure, genericCalls: true, annotations: true }),
  tokenize: nestedComments,
  identifier,
  keywords: 'actor any as associatedtype async await borrowing break case catch class consuming continue convenience copy default defer deinit didSet distributed do dynamic each else enum extension fallthrough fileprivate final for func get guard if import in indirect infix init inout internal is isolated lazy let macro mutating nonisolated nonmutating open operator optional override package postfix precedencegroup prefix private protocol public repeat required rethrows return self Self sending set some static struct subscript super switch throws throw try typealias unowned var weak where while willSet'.split(' '),
  types: 'Any AnyObject Bool Character Double Float Int Int8 Int16 Int32 Int64 Never String UInt UInt8 UInt16 UInt32 UInt64 Void'.split(' '),
  booleans: ['true', 'false'],
  nulls: ['nil'],
  rules: [
    whitespace, lineComment, blockComment,
    { type: 'string', pattern: /(?<!#)(?:(#+)"""[\s\S]*?(?:"""\1|$)|(#+)"[\s\S]*?(?:"\2|$))/ },
    tripleString, doubleString,
    { type: 'variable', pattern: /`[^`\r\n]*(?:`|$)|\$\d+/ },
    { type: 'attribute', pattern: /@[_\p{ID_Start}]\p{ID_Continue}*/u },
    { type: 'keyword', pattern: /#[_\p{ID_Start}]\p{ID_Continue}*/u },
    number,
    { type: 'operator', pattern: /\.\.<|&[+*\-]=?/ },
    operator, punctuation,
  ],
}
