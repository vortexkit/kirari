import { definitionsFor } from '../grammars/definitions.js'
import type { Language } from '../types.js'

export const sql: Language = {
  name: 'sql',
  definitions: definitionsFor({ declaration: /^(function|procedure)$/i }),
  rules: [
    { type: 'text', pattern: /\s+/ },
    { type: 'comment', pattern: /--[^\r\n]*|\/\*[^]*?(?:\*\/|$)/ },
    { type: 'string', pattern: /'(?:''|[^'])*(?:'|$)/ },
    { type: 'property', pattern: /"(?:""|[^"])*(?:"|$)|`(?:``|[^`])*(?:`|$)|\[(?:\]\]|[^\]])*(?:\]|$)/ },
    { type: 'boolean', pattern: /\b(?:true|false)\b/i },
    { type: 'null', pattern: /\bnull\b/i },
    { type: 'keyword', pattern: /\b(?:select|from|where|insert|into|values|update|set|delete|create|alter|drop|table|view|index|database|schema|with|recursive|as|distinct|all|join|inner|outer|left|right|full|cross|on|using|group|by|having|order|asc|desc|limit|offset|fetch|union|intersect|except|case|when|then|else|end|and|or|not|in|is|like|ilike|between|exists|over|partition|rows|range|current|row|preceding|following|unbounded|primary|foreign|key|references|unique|constraint|default|check|returning|begin|commit|rollback|if|replace|truncate)\b/i },
    { type: 'type', pattern: /\b(?:int|integer|bigint|smallint|decimal|numeric|real|float|double|precision|varchar|char|text|boolean|date|time|timestamp|interval|json|jsonb|uuid|blob)\b/i },
    { type: 'variable', pattern: /\$\d+|[:@][a-zA-Z_]\w*/ },
    { type: 'number', pattern: /(?:\d*\.\d+|\d+)(?:[eE][+-]?\d+)?/ },
    { type: 'function', pattern: /[a-zA-Z_]\w*(?=\s*\()/ },
    { type: 'variable', pattern: /[a-zA-Z_]\w*/ },
    { type: 'operator', pattern: /::|<>|!=|<=|>=|\|\||[-+*/%=<>]/ },
    { type: 'punctuation', pattern: /[(),.;]/ },
  ],
}
