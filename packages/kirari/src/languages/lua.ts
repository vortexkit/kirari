import { definitionsFor } from '../grammars/definitions.js'
import { scanWithOverrides } from '../tokenize.js'
import type { Language, Token } from '../types.js'
import { whitespace, number, operator, punctuation } from '../grammars/clike.js'

const longBrackets = (source: string, language: Language): Token[] => {
  return scanWithOverrides(source, language, token => {
    if (token.type !== 'string' && token.type !== 'comment' || !/^(?:--)?\[=*\[$/.test(token.value)) return undefined
    const level = token.value.length - (token.type === 'comment' ? 4 : 2)
    let end = token.end
    while (end < source.length) {
      if (source[end++] !== ']') continue
      const equals = end
      while (source[end] === '=') end++
      if (end - equals === level && source[end] === ']') { end++; break }
    }
    return { ...token, value: source.slice(token.start, end), end }
  })
}

export const lua: Language = {
  name: 'lua',
  definitions: definitionsFor({ declaration: /^function$/, literal: /^function$/ }),
  tokenize: longBrackets,
  identifier: /[a-zA-Z_]\w*/,
  keywords: 'and break do else elseif end for function goto if in local not or repeat return then until while'.split(' '),
  booleans: ['true', 'false'],
  nulls: ['nil'],
  rules: [
    whitespace,
    { type: 'comment', pattern: /--\[=*\[/ },
    { type: 'comment', pattern: /--[^\r\n]*/ },
    { type: 'string', pattern: /\[=*\[/ },
    { type: 'string', pattern: /"(?:\\(?:z\s*|\r\n|[\s\S]|$)|[^"\\\r\n])*(?:"|(?=[\r\n])|$)|'(?:\\(?:z\s*|\r\n|[\s\S]|$)|[^'\\\r\n])*(?:'|(?=[\r\n])|$)/ },
    number,
    { type: 'operator', pattern: /~=|\/\/|[~#]/ },
    operator, punctuation,
  ],
}
