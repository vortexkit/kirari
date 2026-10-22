import { definitionsFor } from '../grammars/definitions.js'
import type { Language } from '../types.js'
import { identifier, whitespace, lineComment, blockComment, preprocessor, operator, punctuation } from '../grammars/clike.js'

export const c: Language = {
  name: 'c',
  definitions: definitionsFor({}),
  identifier,
  keywords: 'alignas alignof auto break case const constexpr continue default do else enum extern for goto if inline register restrict return sizeof static static_assert struct switch thread_local typedef typeof typeof_unqual union volatile while _Alignas _Alignof _Atomic _Generic _Noreturn _Static_assert _Thread_local'.split(' '),
  types: 'bool char double float int long short signed unsigned void _Bool _Complex _Imaginary'.split(' '),
  booleans: ['true', 'false'],
  nulls: ['NULL', 'nullptr'],
  rules: [
    whitespace, lineComment, blockComment, preprocessor,
    { type: 'string', pattern: /(?:u8|[uUL])?(?:"(?:\\(?:[\s\S]|$)|[^"\\\r\n])*(?:"|(?=[\r\n])|$)|'(?:\\(?:[\s\S]|$)|[^'\\\r\n])*(?:'|(?=[\r\n])|$))/ },
    { type: 'number', pattern: /(?:0[xX][\da-fA-F']+(?:\.[\da-fA-F']*)?(?:[pP][+-]?[\d']+)?|0[bB][01']+|\d[\d']*(?:\.(?!\.)[\d']*)?(?:[eE][+-]?[\d']+)?|\.\d[\d']*(?:[eE][+-]?[\d']+)?)(?:[uUlLfF]+|[uU]?[wW][bB])?/ },
    operator, punctuation,
  ],
}
