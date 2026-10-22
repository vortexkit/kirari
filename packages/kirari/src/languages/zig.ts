import { definitionsFor } from '../grammars/definitions.js'
import type { Language } from '../types.js'
import { identifier, whitespace, lineComment, quotedString, number, operator, punctuation } from '../grammars/clike.js'

export const zig: Language = {
  name: 'zig',
  definitions: definitionsFor({ declaration: /^fn$/ }),
  identifier,
  keywords: 'addrspace align allowzero and anyframe anytype asm async await break callconv catch comptime const continue defer else enum errdefer error export extern fn for if inline linksection noalias noinline nosuspend opaque or orelse packed pub resume return section struct suspend switch test threadlocal try union unreachable usingnamespace var volatile while'.split(' '),
  types: 'anyerror bool c_char c_short c_ushort c_int c_uint c_long c_ulong c_longlong c_ulonglong c_longdouble comptime_float comptime_int f16 f32 f64 f80 f128 isize usize noreturn type void anyopaque'.split(' '),
  booleans: ['true', 'false'],
  nulls: ['null', 'undefined'],
  rules: [
    whitespace, lineComment,
    { type: 'string', pattern: /\\\\[^\r\n]*/ },
    { type: 'variable', pattern: /@"(?:\\(?:[\s\S]|$)|[^"\\\r\n])*(?:"|(?=[\r\n])|$)/ },
    quotedString,
    { type: 'function', pattern: /@[a-zA-Z_]\w*/ },
    { type: 'type', pattern: /[iu]\d+\b/ },
    number,
    { type: 'operator', pattern: /<<\|=?|[+*\-][%|]=?|\.\*|\.\?/ },
    operator, punctuation,
  ],
}
