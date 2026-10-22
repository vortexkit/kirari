import { definitionsFor } from '../grammars/definitions.js'
import type { Language } from '../types.js'
import { identifier, whitespace, lineComment, blockComment, number, operator, punctuation, preprocessor } from '../grammars/clike.js'

export const glsl: Language = {
  name: 'glsl',
  definitions: definitionsFor({}),
  identifier,
  keywords: 'attribute break buffer case centroid coherent const continue default discard do else flat for highp if in inout invariant layout lowp mediump noperspective out patch precision readonly restrict return sample shared smooth struct subroutine switch uniform varying volatile while writeonly'.split(' '),
  types: 'void bool int uint float double atomic_uint'.split(' '),
  booleans: ['true', 'false'],
  rules: [
    whitespace, lineComment, blockComment, preprocessor,
    { type: 'type', pattern: /(?:(?:[biud]?vec[234])|(?:d?mat[234](?:x[234])?)|(?:[iu]?(?:sampler|image)(?:1D|2D|3D|Cube|2DRect|Buffer)(?:MS)?(?:Array)?(?:Shadow)?))\b/ },
    { type: 'variable', pattern: /gl_[a-zA-Z_]\w*/ },
    { type: 'number', pattern: new RegExp(`${number.pattern.source}(?:[lL][fF]|[uUfF])?`) },
    operator, punctuation,
  ],
}
