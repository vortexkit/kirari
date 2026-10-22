import { changelogMarkdownPath } from '@/features/changelog/changelog.content'
import { packages } from '@/features/changelog/changelog.data'
import { sectionGroups, sections } from '@/lib/navigation'
import { site } from '@/lib/site'

export const dynamic = 'force-static'

export const GET = () =>
	new Response(
		[
			`# Kirari (v${site.version})`,
			'',
			'> Lightweight syntax highlighting with 48 languages, CSS-variable themes, React and Rehype integrations, and token streaming.',
			'',
			'The guides below are plain Markdown, served from the same files used by the documentation website.',
			'',
			...sectionGroups.map(
				group =>
					`## ${group}\n\n${sections
						.filter(section => section.group === group)
						.map(
							section =>
								`- [${section.title}](${site.url}/docs/${section.id}.md): ${section.description}`,
						)
						.join('\n')}\n`,
			),
			'## Changelogs',
			'',
			'Every published release, newest first. Breaking changes end with numbered migration steps.',
			'',
			...packages.map(
				item =>
					`- [${item.name}](${site.url}${changelogMarkdownPath(item.id)}): Releases of ${item.name}.`,
			),
			'',
			'## Resources',
			'',
			`- [Complete documentation](${site.url}/llms-full.txt): All guides in one Markdown document.`,
			`- [Playground](${site.url}/playground/): Try code, languages, and themes.`,
			`- [Comparison](${site.url}/compare/): Kirari vs Shiki, Prism, and highlight.js.`,
			`- [Source code](${site.github})`,
			`- [npm package](${site.npm})`,
			'',
		].join('\n'),
		{
			headers: {
				'Content-Type': 'text/plain; charset=utf-8',
			},
		},
	)
