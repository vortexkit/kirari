import { definitionsFor } from '../grammars/definitions.js'
import type { Language } from '../types.js'
import { whitespace, blockComment, number, operator, punctuation } from '../grammars/clike.js'

const keywords = 'abstract and array as break callable case catch class clone const continue declare default die do echo else elseif empty enddeclare endfor endforeach endif endswitch endwhile enum eval exit extends final finally fn for foreach function global goto if implements include include_once instanceof insteadof interface isset list match namespace new or print private protected public readonly require require_once return static switch throw trait try unset use var while xor yield from'.split(' ')

export const php: Language = {
  name: 'php',
  definitions: definitionsFor({ declaration: /^function$/i, literal: /^(function|fn)$/i, literalBody: true, modifiers: /^static$/i }),
  identifier: /[_\p{ID_Start}]\p{ID_Continue}*/u,
  keywords,
  types: 'bool float int iterable mixed never object string void'.split(' '),
  booleans: ['true', 'false', 'TRUE', 'FALSE'],
  nulls: ['null', 'NULL'],
  rules: [
    whitespace, blockComment,
    { type: 'comment', pattern: /\/\/(?:(?!\?>)[^\r\n])*/ },
    { type: 'punctuation', pattern: /<\?(?:php\b|=)?|\?>|#\[/i },
    { type: 'comment', pattern: /#(?!\[)(?:(?!\?>)[^\r\n])*/ },
    { type: 'string', pattern: /<<<[\t ]*['"]?([a-zA-Z_]\w*)['"]?[\t ]*\r?\n[\s\S]*?(?:^[\t ]*\1(?=[^\w]|$)|(?![\s\S]))/m },
    { type: 'string', pattern: /[bB]?(?:"(?:\\(?:[\s\S]|$)|[^"\\])*(?:"|$)|'(?:\\(?:[\s\S]|$)|[^'\\])*(?:'|$)|`(?:\\(?:[\s\S]|$)|[^`\\])*(?:`|$))/ },
    { type: 'variable', pattern: /(?<!\$)\$+[_\p{ID_Start}]\p{ID_Continue}*/u },
    { type: 'keyword', pattern: new RegExp(`(?:${keywords.join('|')})(?![\\p{ID_Continue}])`, 'iu') },
    { type: 'boolean', pattern: /(?:true|false)(?![\p{ID_Continue}])/iu },
    { type: 'null', pattern: /null(?![\p{ID_Continue}])/iu },
    number,
    { type: 'operator', pattern: /\?->|===|!==|<=>|\.=/ },
    operator, punctuation,
  ],
}
