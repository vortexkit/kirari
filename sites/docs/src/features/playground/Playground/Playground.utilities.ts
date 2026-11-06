import type * as Types from './Playground.types'

export const usageCode = (props: Types.UsageOptions) => {
	const { name, theme, source, usage } = props
	const imports = `import { ${name} } from 'kirari/languages'
import 'kirari/themes/${theme}.css'`
	const literal = (value: string) =>
		`\`${value.replace(/\\/g, '\\\\').replace(/`/g, '\\`').replace(/\$\{/g, '\\${')}\``
	if (usage === 'react')
		return `import { Code } from 'kirari-react'
${imports}

const code = ${literal(source)}

export const Example = () => <Code language={${name}}>{code}</Code>`
	if (usage === 'markdown') {
		const fence = '`'.repeat(
			Math.max(
				3,
				...[
					...source.matchAll(/`+/g),
				].map(match => match[0].length + 1),
			),
		)
		return `import { unified } from 'unified'
import remarkParse from 'remark-parse'
import remarkRehype from 'remark-rehype'
import rehypeStringify from 'rehype-stringify'
import rehypeKirari from 'kirari-rehype'
${imports}

const markdown = ${literal(`${fence}${name}\n${source}\n${fence}`)}

const html = String(await unified()
  .use(remarkParse)
  .use(remarkRehype)
  .use(rehypeKirari, { languages: [${name}] })
  .use(rehypeStringify)
  .process(markdown))`
	}
	return `import { highlight } from 'kirari'
${imports}

const code = ${literal(source)}

const html = highlight(code, { language: ${name} })
const block = \`<pre class="kirari"><code>\${html}</code></pre>\``
}
