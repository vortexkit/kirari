# API reference

Core functions, optional entry points, and their options.

A small API for the straightforward case, with optional entry points when you need more.

## highlight(source, options?)

Returns an escaped HTML fragment. Options accept a `language` definition, a token-to-class `classes` map, and a `className(token)` callback. JavaScript is the default.

## tokenize(source, language?)

Returns `Token[]` with `type`, `value`, `start`, and `end`. The main `kirari` entry defaults to JavaScript; `kirari/core` requires an explicit language.

## render(tokens, options?)

Returns escaped HTML from readonly tokens. Custom classes append to Kirari’s standard classes. Rendering does not mutate tokens.

| Import | What you get |
| --- | --- |
| `kirari` | All three core functions, with JavaScript defaults |
| `kirari/core` | tokenize, render, token types; no default language |
| `kirari/stream` | [createTokenStream](/docs/streaming/), TokenStream, TokenPatch |
| `kirari/decorations` | [renderDecorated](/docs/decorations/), Decoration, DecoratedRenderOptions |
| `kirari/registry` | [createRegistry](/docs/markdown/), LanguageRegistry |
| `kirari/markdown` | [createMarkdown(registry)](/docs/markdown/) |
| `kirari/languages` | Every language definition as a named export |
| `kirari/languages/*` | One named language definition |
| `kirari/theme.css` | Optional theme, driven by CSS variables |
| `kirari-rehype` | [Optional Markdown and MDX plugin](/docs/rehype/), Options |

Core TypeScript types include `Token`, `TokenType`, `Language`, `Rule`, `RenderOptions`, and `HighlightOptions`. Import optional APIs and their types from their own entry points.
