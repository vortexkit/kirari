import { unified } from 'unified'
import rehypeKirari, { type Options } from 'kirari-rehype'
import { javascript } from 'kirari/languages/javascript'
import type { Token } from 'kirari/core'

const options: Options = {
  languages: [javascript],
  lines: true,
  classes: { variable: 'identifier' },
  className: (token: Token) => token.start === 0 ? 'first' : undefined,
  lineClassName: line => line.number === 1 && line.end >= line.start ? 'active' : undefined,
}
unified().use(rehypeKirari, options)
unified().use(rehypeKirari)

// @ts-expect-error Register language definitions, not implicit global names.
const invalid: Options = { languages: ['javascript'] }
void invalid
