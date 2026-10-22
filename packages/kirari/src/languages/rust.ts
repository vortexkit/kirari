import { definitionsFor } from '../grammars/definitions.js'
import type { FunctionSyntax } from '../grammars/definitions.js'
import type { Language } from '../types.js'
import { nestedComments, identifier, whitespace, lineComment, blockComment, number, operator, punctuation } from '../grammars/clike.js'

// Closures: `|x| x + 1` and `|| …`.
const closure: FunctionSyntax['forms'] = first => first === '|' || first === '||' ? true : undefined

export const rust: Language = {
  name: 'rust',
  definitions: definitionsFor({ declaration: /^fn$/, modifiers: /^(async|move)$/, forms: closure, genericCalls: true, annotations: true }),
  tokenize: nestedComments,
  identifier,
  keywords: 'as async await break const continue crate dyn else enum extern fn for if impl in let loop match mod move mut pub ref return self Self static struct super trait type union unsafe use where while abstract become box do final macro override priv typeof unsized virtual yield try gen'.split(' '),
  types: 'bool char str f32 f64 i8 i16 i32 i64 i128 isize u8 u16 u32 u64 u128 usize'.split(' '),
  booleans: ['true', 'false'],
  rules: [
    whitespace, lineComment, blockComment,
    { type: 'string', pattern: /(?:br|cr|r)(#*)"[\s\S]*?(?:"\1|$)/ },
    { type: 'string', pattern: /[bc]?"(?:\\(?:[\s\S]|$)|[^"\\])*(?:"|$)/ },
    { type: 'string', pattern: /b?'(?:\\(?:u\{[\da-fA-F_]+\}|x[\da-fA-F]{2}|[^\r\n])|[^'\\\r\n])'/u },
    { type: 'variable', pattern: /'(?:r#)?[_\p{ID_Start}]\p{ID_Continue}*/u },
    { type: 'variable', pattern: /r#[_\p{ID_Start}]\p{ID_Continue}*/u },
    { type: 'function', pattern: /[_\p{ID_Start}]\p{ID_Continue}*!(?!=)/u },
    { type: 'number', pattern: new RegExp(`${number.pattern.source}(?:[iu](?:8|16|32|64|128|size)|f(?:32|64))?`) },
    { type: 'punctuation', pattern: /#!?\[|\$/ },
    operator, punctuation,
  ],
}
