import { delimiterEnd } from '../../scanner/lexical.js'

// Quoted strings and internal subsets can contain their own `>` characters.
const declarationEnd = (source: string, start: number): number => {
  let end = start + 2
  let brackets = 0
  while (end < source.length) {
    const char = source[end++]
    if (char === '"' || char === "'") end = delimiterEnd(source, char, end)
    else if (char === '[') brackets++
    else if (char === ']') brackets--
    else if (char === '>' && brackets <= 0) break
  }
  return end
}
export const scanDeclaration = (source: string, start: number, emit: (type: string, end: number) => void): boolean => {
  switch (source[start + 1]) {
    case '?':
      emit('keyword', delimiterEnd(source, '?>', start + 2))
      return true
    case '!':
      if (source.startsWith('<!--', start)) emit('comment', delimiterEnd(source, '-->', start + 4))
      else if (source.startsWith('<![CDATA[', start)) emit('string', delimiterEnd(source, ']]>', start + 9))
      else emit('keyword', declarationEnd(source, start))
      return true
  }
  return false
}
