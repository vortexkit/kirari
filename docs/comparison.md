# Comparison measurements

The Compare page uses a JavaScript-to-HTML function from each library, bundled for
the browser with Bun 1.3.4, minified ESM, and gzip level 9. KB means 1,000 bytes.
CSS, streaming helpers, and framework integrations are excluded.

To reproduce without adding competitors to the workspace dependencies:

```sh
comparison_dir=$(mktemp -d)
npm install --prefix "$comparison_dir" --ignore-scripts --no-audit --no-fund \
  shiki@4.5.0 prismjs@1.30.0 highlight.js@11.12.0
bun packages/benchmarks/compare-size.ts "$comparison_dir"
bun run size
```

Competitors measured on 2026-10-21; Kirari working tree measured on 2026-10-22:

| Setup | Gzip bytes |
| --- | ---: |
| Kirari working tree, `highlight()` wrapper | 4,197 |
| Shiki 4.5.0, synchronous core, JavaScript regex engine, JavaScript grammar, GitHub Dark | 73,530 |
| Prism 1.30.0, core, clike dependency, JavaScript grammar | 5,278 |
| highlight.js 11.12.0, core, JavaScript grammar | 11,056 |

The script validates that each bundled function produces highlighted HTML and
preserves an escaped source sample. It does not measure speed or grammar accuracy.

Kirari's full JavaScript entry is 4,294 bytes gzip; its full set of 48 language
definitions with core is 23,273 bytes. These come from `bun run size`. The wrapper
above is smaller because unused exports can be removed. Kirari measurements use
the current source, including unreleased changes; competitors use the named npm
versions. Rerun both commands when the source or bundler changes.

The landing page and Compare page both display the `highlight()` wrapper size
from `site.javascriptHighlightGzipBytes`, rounded to one decimal place in KB.

These are selected configurations, not minimum possible sizes. Shiki also offers
code generation and experimental precompiled grammars. Server/build-time use can
avoid sending any highlighter runtime to the browser for all four libraries.

The page's basic usage examples execute successfully, but the Shiki and Prism
examples use broader imports than the single-language bundles measured above.

## Feature sources

- Shiki: [fine-grained bundles](https://shiki.style/guide/bundles#fine-grained-bundle),
  [synchronous core](https://shiki.style/guide/sync-usage),
  [CSS-variable themes](https://shiki.style/guide/theme-colors#css-variables),
  [streaming](https://shiki.style/packages/stream).
- Prism: [API](https://prismjs.com/docs/Prism.html) and the 1.30.0 package's
  `components.json` (297 language IDs, excluding metadata and aliases).
- highlight.js: [API](https://highlightjs.readthedocs.io/en/latest/api.html) and
  `listLanguages()` in 11.12.0 (193 languages).
- Shiki 4.5.0's `bundledLanguagesInfo` lists 242 languages, excluding aliases.
- Kirari's `src/languages.ts` exports 48 definitions, including plaintext.

Catalog counts describe what ships with these versions, not what's included in
the single-language size measurements. External language packs are not counted.

## Streaming measurements

Use the same external dependency directory as above, then run:

```sh
npm install --prefix "$comparison_dir" --ignore-scripts --no-audit --no-fund @shikijs/stream@4.5.0
bun packages/benchmarks/compare-streaming.ts "$comparison_dir"
```

The script reads prefixes of highlight.js 11.12.0's `lib/core.js`, ending at the
first newline after 2, 8, and 32 KiB. Each prefix arrives in 16 UTF-16 code-unit
chunks, with no batching or arrival delays. The page reports total elapsed time
per complete response, not per-chunk latency or network streaming speed.

Kirari renders token patches. Shiki 4.5.0 uses `ShikiStreamTokenizer` from
`@shikijs/stream` 4.5.0 with the JavaScript engine and GitHub Dark, rendering new
stable tokens and the current unstable tail. Its own style helpers serialize
token colors and font styles. Prism and highlight.js render the whole received
prefix on every update because they have no corresponding streaming API.

Before timing, every rendered prefix is checked for source preservation. Kirari
patches are also checked against its batch tokenizer. There are seven measured
replays per library and block size; execution order rotates and reverses between
rounds. Every replay creates a fresh stream, consumes rendered HTML, and checks
the final source. Highlighter setup and prefix validation are outside timing.
Token bookkeeping, HTML serialization, and final text reconstruction are inside
timing. DOM updates, framework rendering, network delay, and cold startup are
excluded. There is no explicit GC.

Raw samples, medians, runtime, CPU, dependency versions, and the fixture hash are
written to `packages/benchmarks/results/compare-streaming.json`. Values depend on
the source, runtime, engine, and update frequency. Coalescing chunks reduces work
for all four libraries. These measurements do not establish universal speed or
equivalent grammar fidelity.

Measured October 21, 2026, Bun 1.3.4 on Apple M2 Max. Kirari uses the working tree.

| Input bytes | Updates | Kirari | Shiki (JS) | Prism | highlight.js |
| ---: | ---: | ---: | ---: | ---: | ---: |
| 2,073 | 130 | 2.158 ms | 26.598 ms | 31.014 ms | 35.761 ms |
| 8,196 | 513 | 9.146 ms | 92.980 ms | 510.353 ms | 605.242 ms |
| 32,822 | 2,052 | 63.883 ms | 129.054 ms | 6769.972 ms | 7591.532 ms |
