import { core, languages } from '../test/fixtures/all-languages.js'
import { createTokenStream } from 'kirari/stream'
import { renderDecorated } from 'kirari/decorations'
import { createRegistry } from 'kirari/registry'
import { createMarkdown } from 'kirari/markdown'
import { javascript as streamJavaScript } from 'kirari/languages/javascript'
import { corpus } from '../test/corpus/fixtures.js'

export const api = { core, languages, createTokenStream, renderDecorated, createRegistry, createMarkdown, streamJavaScript, corpus }
