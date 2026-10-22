import { braceClosure, definitionsFor } from '../grammars/definitions.js'
import type { Language } from '../types.js'
import { whitespace } from '../grammars/clike.js'

const keywords = 'begin break catch class clean continue data define do dynamicparam else elseif end enum exit filter finally for foreach from function if in param process return static switch throw trap try until using var while workflow parallel sequence configuration'.split(' ')
const boundary = /(?![\p{L}\p{Nd}_?-])/u

export const powershell: Language = {
  name: 'powershell',
  definitions: definitionsFor({ declaration: /^(function|filter|workflow)$/i, forms: braceClosure }),
  rules: [
    whitespace,
    { type: 'comment', pattern: /#[^\r\n]*|<#[\s\S]*?(?:#>|$)/ },
    { type: 'string', pattern: /@(["'])[\t ]*\r?\n[\s\S]*?(?:^\1@|(?![\s\S]))/m },
    // shortcut: expandable strings stay opaque, including subexpressions; use a parser for nested expression quotes and command-mode context.
    { type: 'string', pattern: /["“”](?:`(?:[\s\S]|$)|["“”]{2}|[^"“”`])*(?:["“”]|$)|['‘’](?:['‘’]{2}|[^'‘’])*(?:['‘’]|$)/ },
    { type: 'boolean', pattern: new RegExp(`\\$(?:true|false)${boundary.source}`, 'iu') },
    { type: 'null', pattern: new RegExp(`\\$null${boundary.source}`, 'iu') },
    { type: 'variable', pattern: /\$\{(?:`(?:[\s\S]|$)|[^}`])*(?:\}|$)|[$@](?:[\p{L}\p{Nd}_?]+:)?[\p{L}\p{Nd}_?]+|\$[$^]/u },
    { type: 'keyword', pattern: new RegExp(`(?:${keywords.join('|')})${boundary.source}`, 'iu') },
    { type: 'operator', pattern: /-(?:[ic]?(?:eq|ne|gt|ge|lt|le|like|notlike|match|notmatch|contains|notcontains|in|notin|replace|split)|and|or|xor|not|band|bor|bxor|bnot|shl|shr|isnot|is|as|join|f)(?![\p{L}\p{Nd}_?-])/iu },
    { type: 'attribute', pattern: /-[\p{L}_][\p{L}\p{Nd}_-]*:?/u },
    { type: 'type', pattern: /\[[a-zA-Z_][\w.+`]*(?:\[\])?\]/ },
    { type: 'number', pattern: /(?:0[xX][\da-fA-F]+|0[bB][01]+|\d+(?:\.(?!\.)\d*)?(?:[eE][+-]?\d+)?|\.\d+(?:[eE][+-]?\d+)?)(?:[uU]?[lLsSyY]|[dDnN])?(?:[kKmMgGtTpP][bB])?/ },
    { type: 'function', pattern: /[\p{L}_][\p{L}\p{Nd}_]*-[\p{L}][\p{L}\p{Nd}_-]*/u },
    { type: 'variable', pattern: /[\p{L}_][\p{L}\p{Nd}_]*/u },
    { type: 'string', pattern: /`(?:\r\n|[\s\S]|$)/ },
    { type: 'operator', pattern: /\?\?=?|\?\.|&&|\|\||::|\.\.|\+\+|--|[+*/%=-]=?|[!&|<>]/ },
    { type: 'punctuation', pattern: /[@$]?[({]|[}\)[\],;:.?]/ },
  ],
}
