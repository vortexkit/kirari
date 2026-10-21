import kirariPackage from '../../../../packages/kirari/package.json' with { type: 'json' }

export const site = {
	name: 'Kirari',
	author: {
		name: 'Ugi',
		url: 'https://ugi.dev',
	},
	url: 'https://kirari.sh',
	npm: 'https://www.npmjs.com/package/@vortexlabs/kirari',
	github: 'https://github.com/vortexkit/kirari',
	x: 'https://x.com/intent/follow?screen_name=ugi_dev',
	version: kirariPackage.version,
	// Tree-shaken highlight() setup; measured by packages/benchmarks/compare-size.ts.
	javascriptHighlightGzipBytes: 4146,
	install: 'npm install @vortexlabs/kirari',
} as const
