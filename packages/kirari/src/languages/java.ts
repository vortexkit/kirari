import { definitionsFor } from '../grammars/definitions.js'
import type { Language } from '../types.js'
import { whitespace, lineComment, blockComment, tripleString, quotedString, number, operator, punctuation } from '../grammars/clike.js'

export const java: Language = {
  name: 'java',
  definitions: definitionsFor({ arrow: '->', genericCalls: true }),
  identifier: /[$_\p{ID_Start}][$\p{ID_Continue}]*/u,
  keywords: 'abstract assert break case catch class const continue default do else enum exports extends final finally for goto if implements import instanceof interface module native new non-sealed open opens package permits private protected provides public record requires return sealed static strictfp super switch synchronized this throw throws to transient transitive try uses var volatile when while with yield'.split(' '),
  types: 'boolean byte char double float int long short void'.split(' '),
  booleans: ['true', 'false'],
  nulls: ['null'],
  rules: [
    whitespace, lineComment, blockComment, tripleString, quotedString,
    { type: 'keyword', pattern: /non-sealed\b/ },
    { type: 'attribute', pattern: /@[\p{ID_Start}_$][\p{ID_Continue}.$]*/u },
    { type: 'number', pattern: new RegExp(`${number.pattern.source}[lLfFdD]?`) },
    operator, punctuation,
  ],
}
