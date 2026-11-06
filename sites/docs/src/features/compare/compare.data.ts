import { site } from '@/lib/site'

/** Measured configurations and sources: docs/comparison.md. Kirari uses the working tree. */
export const libraries = [
	{
		id: 'kirari',
		name: 'Kirari',
		href: '/docs/',
		version: `${site.version} · local build`,
		gzipBytes: site.javascriptHighlightGzipBytes,
	},
	{
		id: 'shiki',
		name: 'Shiki',
		href: 'https://shiki.style',
		version: '4.5.0',
		gzipBytes: 73530,
	},
	{
		id: 'prism',
		name: 'Prism',
		href: 'https://prismjs.com',
		version: '1.30.0',
		gzipBytes: 5278,
	},
	{
		id: 'highlightjs',
		name: 'highlight.js',
		href: 'https://highlightjs.org',
		version: '11.12.0',
		gzipBytes: 11056,
	},
] as const

export const features = [
	{
		label: 'Engine',
		values: [
			'Regex rules and scanners',
			'TextMate grammars',
			'Regex grammars',
			'Regex modes',
		],
	},
	{
		label: 'Languages shipped',
		values: [
			'48',
			'242',
			'297',
			'193',
		],
	},
	{
		label: 'Theming',
		values: [
			'CSS classes and variables',
			'VS Code themes; CSS variables supported',
			'CSS classes',
			'CSS classes',
		],
	},
	{
		label: 'API',
		values: [
			'Synchronous',
			'Sync after setup; synchronous core available',
			'Synchronous',
			'Synchronous',
		],
	},
	{
		label: 'Incremental streaming',
		values: [
			'Built-in token patches',
			'@shikijs/stream',
			'No built-in API',
			'No built-in API',
		],
	},
	{
		label: 'Token offsets',
		values: [
			true,
			true,
			false,
			false,
		],
	},
	{
		label: 'Auto-detection',
		values: [
			false,
			false,
			false,
			true,
		],
	},
] as const

/** Seven warm replays per size; reproduce with packages/benchmarks/compare-streaming.ts. */
export const streamingResults = [
	{
		label: '~2 KiB',
		updates: '130',
		values: [
			'2.2 ms',
			'27 ms',
			'31 ms',
			'36 ms',
		],
	},
	{
		label: '~8 KiB',
		updates: '513',
		values: [
			'9.1 ms',
			'93 ms',
			'510 ms',
			'605 ms',
		],
	},
	{
		label: '~32 KiB',
		updates: '2,052',
		values: [
			'64 ms',
			'129 ms',
			'6.8 s',
			'7.6 s',
		],
	},
] as const

export const snippets = [
	{
		id: 'kirari',
		code: `import { highlight } from 'kirari'
import 'kirari/theme.css'

const html = highlight('const answer = 42')`,
	},
	{
		id: 'shiki',
		code: `import { codeToHtml } from 'shiki'

const html = await codeToHtml('const answer = 42', {
  lang: 'javascript',
  theme: 'github-dark',
})`,
	},
	{
		id: 'prism',
		code: `import Prism from 'prismjs'

const html = Prism.highlight(
  'const answer = 42',
  Prism.languages.javascript,
  'javascript',
)`,
	},
	{
		id: 'highlightjs',
		code: `import hljs from 'highlight.js/lib/core'
import javascript from 'highlight.js/lib/languages/javascript'

hljs.registerLanguage('javascript', javascript)
const html = hljs.highlight('const answer = 42', {
  language: 'javascript',
}).value`,
	},
] as const

export const alternatives = [
	{
		id: 'kirari',
		title: 'Small runtime, live code',
		description:
			'For known languages, incremental token patches, and colors controlled by CSS. Lexical rules trade some grammar fidelity for a small runtime.',
	},
	{
		id: 'shiki',
		title: 'Rich syntax, VS Code themes',
		description:
			'For TextMate scopes, embedded languages, and VS Code themes. Supports synchronous setup, CSS variables, and streaming through @shikijs/stream.',
	},
	{
		id: 'prism',
		title: 'Languages and plugins',
		description:
			'For a broad language catalog and an established plugin ecosystem. Languages register on a shared Prism instance; many plugins target the DOM.',
	},
	{
		id: 'highlightjs',
		title: 'Unlabeled code',
		description:
			'For automatic language detection when the language is unknown. A modular build lets you register only the languages you need.',
	},
] as const
