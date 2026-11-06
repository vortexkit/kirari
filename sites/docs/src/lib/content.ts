import { readFile } from 'node:fs/promises'
import { join } from 'node:path'
import { unified } from 'unified'
import remarkParse from 'remark-parse'
import remarkGfm from 'remark-gfm'
import remarkRehype from 'remark-rehype'
import rehypeStringify from 'rehype-stringify'
import rehypeKirari from 'kirari-rehype'
import { languageEntries } from './languages'
import type * as Types from './navigation.types'

export const readMarkdown = (id: Types.SectionId): Promise<string> =>
	readFile(join(process.cwd(), 'content', `${id}.md`), 'utf8')

export const markdownProcessor = unified()
	.use(remarkParse)
	.use(remarkGfm)
	.use(remarkRehype)
	.use(rehypeKirari, {
		languages: languageEntries.map(entry => entry.language),
	})

export const renderMarkdown = async (id: Types.SectionId): Promise<string> =>
	String(
		await markdownProcessor()
			.use(rehypeStringify)
			.process(await readMarkdown(id)),
	)
