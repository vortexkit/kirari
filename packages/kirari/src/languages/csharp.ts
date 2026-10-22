import { definitionsFor } from '../grammars/definitions.js'
import type { Language, Token } from '../types.js'
import { scan } from '../tokenize.js'
import { identifier, whitespace, lineComment, blockComment, preprocessor, quotedString, number, operator, punctuation } from '../grammars/clike.js'

const rawStrings = (source: string, language: Language): Token[] => {
  const tokens: Token[] = []
  const scanner = scan(source, language)
  let item = scanner.next()
  while (!item.done) {
    let token = item.value
    let resume: number | undefined
    if (token.type === 'string' && /^\$*"{3,}$/.test(token.value)) {
      const width = token.value.length - token.value.indexOf('"')
      let end = token.end
      // Count each quote run once to avoid overlapping delimiter comparisons.
      while (end < source.length) {
        const start = source.indexOf('"', end)
        if (start < 0) { end = source.length; break }
        end = start
        while (source[end] === '"') end++
        if (end - start >= width) break
      }
      token = { ...token, value: source.slice(token.start, end), end }
      resume = end
    }
    const last = tokens[tokens.length - 1]
    if (token.type === 'text' && last?.type === 'text') {
      tokens[tokens.length - 1] = { ...last, value: last.value + token.value, end: token.end }
    } else tokens.push(token)
    item = scanner.next(resume)
  }
  return tokens
}

export const csharp: Language = {
  name: 'csharp',
  definitions: definitionsFor({ literal: /^delegate$/, literalBody: true, modifiers: /^(async|static)$/, arrow: '=>', genericCalls: true, sigilCalls: true }),
  tokenize: rawStrings,
  identifier,
  keywords: 'abstract add alias and as ascending async await base break by case catch checked class const continue default delegate descending do else enum event explicit extern file finally fixed for foreach from get global goto group if implicit in init interface internal into is join let lock managed nameof namespace new not or orderby out override params partial private protected public readonly record ref remove required return scoped sealed select set sizeof stackalloc static struct switch this throw try typeof unchecked unmanaged unsafe using value var virtual volatile when where while with yield'.split(' '),
  types: 'bool byte char decimal double dynamic float int long nint nuint object sbyte short string uint ulong ushort void'.split(' '),
  booleans: ['true', 'false'],
  nulls: ['null'],
  rules: [
    whitespace, lineComment, blockComment, preprocessor,
    { type: 'string', pattern: /(?<!\$)\$*"{3,}/ },
    { type: 'string', pattern: /(?:\$?@|@\$)"(?:""|[^"])*(?:"|$)/ },
    { type: 'string', pattern: /\$"(?:\\(?:[\s\S]|$)|[^"\\\r\n])*(?:"|(?=[\r\n])|$)/ },
    quotedString,
    { type: 'variable', pattern: /@[_\p{ID_Start}]\p{ID_Continue}*/u },
    { type: 'number', pattern: new RegExp(`${number.pattern.source}(?:[uU][lL]?|[lL][uU]?|[fFdDmM])?`) },
    operator, punctuation,
  ],
}
