import type { Language } from '../types.js'

export const javascript: Language = {
  name: 'javascript',
  templates: true,
  regexLiterals: true,
  identifier: /[$_\p{ID_Start}][$\u200c\u200d\p{ID_Continue}]*/u,
  keywords: 'as async await break case catch class const continue debugger default delete do else export extends finally for from function get if import in instanceof let new of return set static super switch this throw try typeof var void while with yield'.split(' '),
  booleans: ['true', 'false'],
  nulls: ['null', 'undefined'],
  rules: [
    { type: 'text', pattern: /\s+/ },
    { type: 'comment', pattern: /^#![^\r\n\u2028\u2029]*/ },
    { type: 'comment', pattern: /\/\/[^\r\n\u2028\u2029]*/ },
    { type: 'comment', pattern: /\/\*[\s\S]*?(?:\*\/|$)/ },
    { type: 'string', pattern: /"(?:\\(?:\r\n|[\s\S]|$)|[^"\\\r\n])*"?|'(?:\\(?:\r\n|[\s\S]|$)|[^'\\\r\n])*'?/ },
    { type: 'number', pattern: /(?:0[xX][\da-fA-F](?:_?[\da-fA-F])*|0[bB][01](?:_?[01])*|0[oO][0-7](?:_?[0-7])*|\d(?:_?\d)*(?:\.(?:\d(?:_?\d)*)?)?(?:[eE][+-]?\d(?:_?\d)*)?|\.\d+(?:[eE][+-]?\d+)?)n?/ },
    { type: 'operator', pattern: /\?\.|=>|\*\*=?|===?|!==?|>>>?=?|<<=?|&&=?|\|\|=?|\?\?=?|\+\+|--|\.\.\.|[+*/%&|^!=<>-]=?|[?~@]/ },
    { type: 'punctuation', pattern: /[{}()[\],;:.]/ },
  ],
}
