import { definitionsFor } from '../grammars/definitions.js'
import { blockComment, lineComment, number, punctuation, quotedString, whitespace } from '../grammars/clike.js'
import type { Language } from '../types.js'

export const protobuf: Language = {
  name: 'protobuf',
  definitions: definitionsFor({ declaration: /^rpc$/ }),
  identifier: /[A-Za-z_]\w*/,
  keywords: ['syntax', 'edition', 'import', 'weak', 'public', 'package', 'option', 'message', 'enum', 'service', 'rpc', 'returns', 'stream', 'oneof', 'map', 'reserved', 'to', 'max', 'extensions', 'extend', 'required', 'optional', 'repeated', 'group'],
  types: ['double', 'float', 'int32', 'int64', 'uint32', 'uint64', 'sint32', 'sint64', 'fixed32', 'fixed64', 'sfixed32', 'sfixed64', 'bool', 'string', 'bytes'],
  booleans: ['true', 'false'],
  rules: [
    whitespace, lineComment, blockComment, quotedString,
    { type: 'keyword', pattern: /(?:syntax|edition)\b/ },
    { type: 'property', pattern: /[A-Za-z_]\w*(?=[\t ]*=)/ },
    // shortcut: custom types use conventional capitals, resolve nonstandard names with a schema parser.
    { type: 'type', pattern: /[A-Z]\w*/ },
    number,
    { type: 'operator', pattern: /[=<>+-]/ },
    punctuation,
  ],
}
