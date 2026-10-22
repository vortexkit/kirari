import { readChangelogMarkdown } from '@/features/changelog/changelog.content'
import { packages } from '@/features/changelog/changelog.data'
import { readMarkdown } from '@/lib/content'
import { docsPath, sections } from '@/lib/navigation'
import { site } from '@/lib/site'

export const dynamic = 'force-static'

export const GET = async () => {
	const guides = await Promise.all(
		sections.map(
			async section =>
				`Source: ${site.url}${docsPath(section.id)}\n\n${await readMarkdown(section.id)}`,
		),
	)
	const changelogs = await Promise.all(packages.map(item => readChangelogMarkdown(item.id)))
	return new Response(
		`# Kirari documentation (v${site.version})\n\n${[
			...guides,
			...changelogs,
		].join('\n---\n\n')}`,
		{
			headers: {
				'Content-Type': 'text/plain; charset=utf-8',
				'X-Robots-Tag': 'noindex',
			},
		},
	)
}
