import { definitionsFor } from '../grammars/definitions.js'
import { scanWithOverrides } from '../tokenize.js'
import type { Language, Token } from '../types.js'
import { whitespace, number } from '../grammars/clike.js'

const rawStrings = (source: string, language: Language): Token[] => {
  return scanWithOverrides(source, language, token => {
    if (token.type !== 'string' || !/^[rR]"-*[(\[{]$/.test(token.value)) return undefined
    const closing = ({ '(': ')', '[': ']', '{': '}' } as const)[token.value.at(-1) as '(' | '[' | '{']
    const dashes = token.value.length - 3
    let end = token.end
    while (end < source.length) {
      if (source[end++] !== closing) continue
      const start = end
      while (source[end] === '-') end++
      if (end - start === dashes && source[end] === '"') { end++; break }
    }
    return { ...token, value: source.slice(token.start, end), end }
  })
}

export const r: Language = {
  name: 'r',
  definitions: definitionsFor({ literal: /^(function|\\)$/, assignment: /^(=|<-|<<-)$/ }),
  tokenize: rawStrings,
  identifier: /(?:[\p{L}]|\.(?!\d))[\p{L}\d._]*/u,
  keywords: 'if else repeat while function for in next break'.split(' '),
  booleans: ['TRUE', 'FALSE'],
  nulls: ['NULL', 'NA', 'NA_integer_', 'NA_real_', 'NA_complex_', 'NA_character_'],
  rules: [
    whitespace,
    { type: 'comment', pattern: /#[^\r\n]*/ },
    { type: 'string', pattern: /[rR]"-*[(\[{]/ },
    { type: 'string', pattern: /"(?:\\(?:[\s\S]|$)|[^"\\])*(?:"|$)|'(?:\\(?:[\s\S]|$)|[^'\\])*(?:'|$)/ },
    { type: 'variable', pattern: /`(?:\\(?:[\s\S]|$)|[^`\\])*(?:`|$)/ },
    { type: 'number', pattern: /(?:Inf|NaN)\b/ },
    { type: 'number', pattern: new RegExp(`${number.pattern.source}[Li]?`) },
    { type: 'operator', pattern: /%[^%\r\n]*(?:%|(?=[\r\n])|$)|<<-|->>|<-|->|:::?|\|>|&&|\|\||[+*/^<>=!]=?|[-~&|:$@?\\]/ },
    { type: 'punctuation', pattern: /[{}()[\],;]/ },
  ],
}
