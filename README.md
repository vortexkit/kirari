# Kirari

Kirari is a small, dependency-free syntax highlighter for JavaScript and
TypeScript apps. It turns source code into escaped HTML or a token array on the
server, at build time, or in the browser, without a DOM. It is a lexical
highlighter, not a parser.

- **Small:** about 4.2 KB gzipped with JavaScript, about 23 KB with all 48 languages.
- **Streaming:** emits token patches as code arrives, such as LLM output.
- **Themeable:** CSS-variable themes, with 21 built in.
- **Integrations:** a React `<Code>` component that works in Server Components,
  and a Rehype plugin for Markdown and MDX.

[Documentation](https://kirari.sh/docs/) · [Playground](https://kirari.sh/playground/)

## Quick start

```sh
npm install @vortexlabs/kirari
```

In an application that supports CSS imports:

```ts
import { highlight } from '@vortexlabs/kirari'
import '@vortexlabs/kirari/theme.css'

const code = 'const count = 42'
const html = `<pre class="kirari"><code>${highlight(code)}</code></pre>`
```

Use `html` in your page template. JavaScript is the default language, and code
text is HTML-escaped. Import other languages explicitly:

```ts
import { highlight } from '@vortexlabs/kirari'
import { python } from '@vortexlabs/kirari/languages'

const html = highlight('print("Hello")', { language: python })
```

Kirari uses ES modules and requires an ES2022-compatible runtime. Bun is used to
develop the library; applications do not need Bun to use it.

## Packages

| Package | Use it for |
| --- | --- |
| [`@vortexlabs/kirari`](packages/kirari/README.md) | HTML highlighting, tokens, languages, and themes |
| [`@vortexlabs/kirari-react`](packages/react/README.md) | React components and a streaming hook; requires React 19 |
| [`@vortexlabs/kirari-rehype`](packages/rehype/README.md) | Highlighted code blocks in Markdown and MDX |

## Guides

- [Languages and syntax limits](docs/accuracy.md)
- [Streaming code](docs/streaming.md)
- [Line highlighting and decorations](docs/decorations.md)
- [Language lookup and Markdown fences](docs/language-integration.md)
- [Installation](docs/installation.md) and [benchmarks](packages/benchmarks/README.md)

Kirari highlights source text without validating programs or resolving types.
Language coverage varies; see the accuracy guide for supported cases and limits.

## Development

Clone this repository and run these commands from its root, using Node.js 26
(selected by `.nvmrc`) and the Bun version in `package.json`. CI also checks
Node.js 24 compatibility:

```sh
bun install
bun run dev
```

`dev` builds the packages before starting the Next.js documentation site at
[localhost:4173](http://localhost:4173). After changing package source, run
`bun run build:integrations` to refresh its exported files. Guides live in plain
Markdown under `sites/docs/content/`; the site also serves individual `.md` URLs,
`/llms.txt`, and `/llms-full.txt`.

```sh
bun run build          # Build all packages and the documentation site
bun run build:integrations # Build Kirari and its Rehype and React integrations
bun run pack:preview   # Pack release archives into .packs for testing
bun run check          # Lint with Biome, then check all packages, documentation site, and benchmark harness
bun run lint           # Lint the workspace with Biome
bun run test           # Run library and integration tests
bun run test:integrations # Run Rehype and React integration tests
bun run test:corpus    # Run annotated correctness and partial-input checks
bun run benchmark      # Measure highlighting speed and browser bundle size
bun run benchmark:stream # Compare full-prefix and checkpoint streaming
bun run size           # Measure library browser bundles
bun run check:browser  # Generate the standalone browser checks
bun run check:packages # Install archives in a fresh external consumer; check types and exports
bun run changeset      # Describe a change for the next release
bun run release:kirari # Publish only the core package
bun run release:kirari-rehype # Publish only the Rehype integration
bun run release:kirari-react # Publish only the React integration
```

Open `packages/kirari/.checks/browser.html` after `check:browser` to run the browser
checks. See the [library README](packages/kirari/README.md) for its API and examples.
See the [installation guide](docs/installation.md) and [release process](RELEASING.md).

Packages are versioned independently. Run `bun run changeset` and select the
affected packages, then use their package-specific release commands.

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md). Report security issues privately as described in [SECURITY.md](SECURITY.md).

## License

[MIT](LICENSE) © 2026 [Ugi](https://ugi.dev)
