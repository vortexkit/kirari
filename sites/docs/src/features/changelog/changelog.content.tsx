import { readdir, readFile } from 'node:fs/promises'
import { join } from 'node:path'
import { Fragment, isValidElement } from 'react'
import type { ReactNode } from 'react'
import { jsx, jsxs } from 'react/jsx-runtime'
import rehypeReact from 'rehype-react'
import type { Element } from 'hast'
import { parse as parseYaml } from 'yaml'
import { z } from 'zod'
import { categories, packages } from './changelog.data'
import { markdownProcessor } from '@/lib/content'
import { CodeBlock } from '@/components/code/CodeBlock'
import { Link } from '@/components/ui/Link'
import type * as Types from './changelog.types'

type Root = ReturnType<typeof markdownProcessor.parse>
type Node = Root['children'][number]
type Heading = Extract<
	Node,
	{
		type: 'heading'
	}
>

export type ParsedRelease = z.infer<typeof frontmatterSchema> & {
	/** Markdown after the frontmatter; node positions are offsets into it. */
	body: string
	sections: Record<Types.Category, Node[]>
}

type TextNode = {
	value?: string
	children?: readonly TextNode[]
}

const text = (node: TextNode): string => node.value ?? node.children?.map(text).join('') ?? ''

const isHeading = (node: Node | undefined, depth: number): node is Heading =>
	node?.type === 'heading' && node.depth === depth

const isMigrateLabel = (node: Node | undefined) =>
	node?.type === 'paragraph' &&
	node.children.length === 1 &&
	node.children[0]!.type === 'strong' &&
	text(node.children[0]!) === 'How to migrate'

const versionPattern = /^\d+\.\d+\.\d+$/

/** Orders `major.minor.patch` versions; negative when `left` is older. */
export const compareVersions = (left: string, right: string) => {
	const a = left.split('.').map(Number)
	const b = right.split('.').map(Number)
	return a[0]! - b[0]! || a[1]! - b[1]! || a[2]! - b[2]!
}

const frontmatterSchema = z.strictObject({
	package: z.enum(
		packages.map(item => item.id) as [
			Types.PackageId,
			...Types.PackageId[],
		],
	),
	version: z.string().regex(versionPattern, 'use a full version such as 1.2.3'),
	date: z.iso.date('use a real date as YYYY-MM-DD'),
})

/**
 * A new release file with every section heading and no changes. It fails validation until the
 * relevant sections are filled in and the empty ones are deleted.
 */
export const releaseTemplate = (id: Types.PackageId, version: string, date: string) =>
	`---\npackage: ${id}\nversion: ${version}\ndate: ${date}\n---\n\n${categories
		.map(category => `### ${category.label}\n`)
		.join('\n')}`

/**
 * Parses one release file, `changelog/<package>/<version>.md`, and rejects anything that strays
 * from the template: frontmatter with exactly `package`, `version`, and `date` matching the path,
 * then at least one of `### Breaking changes`, `### Improvements`, and `### Bug fixes`, in that
 * order, each with changes. Improvements and fixes are a bullet list; each breaking change is a
 * `####` title that explains the break and gives `**How to migrate**` with numbered steps.
 */
export const parseRelease = (source: string, path: string): ParsedRelease => {
	const fail = (line: number | undefined, message: string): never => {
		throw new Error(`changelog/${path}${line ? `:${line}` : ''}: ${message}`)
	}

	const block = /^---\r?\n([\s\S]*?)\r?\n---\r?\n/.exec(source)
	if (!block) return fail(1, 'start with frontmatter between "---" lines')
	let data: unknown
	try {
		data = parseYaml(block[1]!)
	} catch (error) {
		return fail(undefined, `frontmatter is not valid YAML: ${(error as Error).message}`)
	}
	const frontmatter = frontmatterSchema.safeParse(data)
	if (!frontmatter.success) {
		const issue = frontmatter.error.issues[0]!
		return fail(undefined, `frontmatter ${issue.path.join('.') || 'block'}: ${issue.message}`)
	}
	const { package: id, version } = frontmatter.data
	if (path !== `${id}/${version}.md`)
		fail(
			undefined,
			`frontmatter says ${id}/${version}.md; move the file or fix the frontmatter`,
		)

	const offset = block[0].split('\n').length - 1
	const releaseBody = source.slice(block[0].length)
	const nodes = markdownProcessor.parse(releaseBody).children
	const line = (node: Node | undefined) =>
		node?.position ? node.position.start.line + offset : undefined
	const sections: ParsedRelease['sections'] = {
		breaking: [],
		improvements: [],
		fixes: [],
	}
	const expected = categories.map(category => `"### ${category.label}"`).join(', ')
	if (!nodes.length) fail(undefined, `add at least one section: ${expected}`)
	let index = 0
	let previous = -1
	while (index < nodes.length) {
		const title = nodes[index]
		const position = isHeading(title, 3)
			? categories.findIndex(item => item.label === text(title))
			: -1
		if (position < 0) fail(line(title), `expected one of the sections ${expected}`)
		const category = categories[position]!
		if (position === previous) fail(line(title), `"### ${category.label}" appears twice`)
		if (position < previous) {
			fail(
				line(title),
				`"### ${category.label}" must come before "### ${categories[previous]!.label}"`,
			)
		}
		previous = position
		index++
		const body: Node[] = []
		while (
			index < nodes.length &&
			!(nodes[index]!.type === 'heading' && (nodes[index] as Heading).depth <= 3)
		) {
			body.push(nodes[index++]!)
		}
		const where = category.label
		if (!body.length) fail(line(title), `${where}: add changes, or delete the empty section`)
		if (body.length === 1 && body[0]!.type === 'paragraph' && text(body[0]!) === 'None.') {
			fail(line(body[0]), `${where}: delete the section instead of writing "None."`)
		}
		if (category.id !== 'breaking') {
			if (body.length !== 1 || body[0]!.type !== 'list' || body[0]!.ordered) {
				fail(line(body[0]), `${where}: use one bullet list`)
			}
		} else {
			if (!isHeading(body[0], 4))
				fail(line(body[0]), `${where}: start each change with a "####" title`)
			const starts = body.flatMap((node, start) =>
				isHeading(node, 4)
					? [
							start,
						]
					: [],
			)
			for (const [n, start] of starts.entries()) {
				const change = body.slice(start, starts[n + 1])
				const label = change.findIndex(isMigrateLabel)
				const steps = change[label + 1]
				if (label < 0)
					fail(
						line(change[0]),
						`${where}: add "**How to migrate**" followed by numbered steps`,
					)
				if (label < 2 || change.slice(1, label).some(node => node.type !== 'paragraph')) {
					fail(
						line(change[0]),
						`${where}: explain the change in a paragraph before "**How to migrate**"`,
					)
				}
				if (steps?.type !== 'list' || !steps.ordered) {
					fail(
						line(change[label]),
						`${where}: follow "**How to migrate**" with numbered steps`,
					)
				}
				const extra = change
					.slice(label + 2)
					.find(node => node.type !== 'paragraph' && node.type !== 'code')
				if (extra)
					fail(
						line(extra),
						`${where}: only paragraphs and code blocks may follow the steps`,
					)
			}
		}
		sections[category.id] = body
	}
	return {
		...frontmatter.data,
		body: releaseBody,
		sections,
	}
}

const snippetLabel = (code: Element | undefined) => {
	const meta = code?.data && 'meta' in code.data ? String(code.data.meta) : ''
	if (/\bbefore\b/.test(meta)) return 'Before'
	if (/\bafter\b/.test(meta)) return 'After'
	return /language-(?:sh|shell|bash)\b/.test(String(code?.properties.className)) ? 'Run' : 'Code'
}

const renderSection = (nodes: Node[], id: string) => {
	const tree = markdownProcessor.runSync({
		type: 'root',
		children: nodes,
	})
	return markdownProcessor()
		.use(rehypeReact, {
			Fragment,
			jsx,
			jsxs,
			passNode: true,
			components: {
				a: (props: { href?: string; children?: ReactNode }) => (
					<Link href={props.href ?? ''} variant="subtle">
						{props.children}
					</Link>
				),
				p: (props: { node?: Element; children?: ReactNode }) => {
					const only =
						props.node?.children.length === 1 ? props.node.children[0] : undefined
					const migrate =
						only?.type === 'element' &&
						only.tagName === 'strong' &&
						text(only) === 'How to migrate'
					return <p data-migrate={migrate || undefined}>{props.children}</p>
				},
				pre: (props: { node?: Element; className?: string; children?: ReactNode }) => {
					const code = props.node?.children.find(
						(child): child is Element => child.type === 'element',
					)
					const label = snippetLabel(code)
					return (
						<CodeBlock
							id={`${id}-code-${props.node?.position?.start.line ?? 0}`}
							label={label}
							text={code ? text(code) : ''}
							preClassName={props.className}
							codeClassName={code?.properties.className
								?.toString()
								.replaceAll(',', ' ')}
							copyLabel={`Copy ${label.toLowerCase()} snippet`}
						>
							{isValidElement<{
								children?: ReactNode
							}>(props.children)
								? props.children.props.children
								: props.children}
						</CodeBlock>
					)
				},
			},
		})
		.stringify(tree)
}

/** Validated releases of one package, newest first, including versions not yet published. */
export const readPackageReleases = async (
	id: Types.PackageId,
	root = join(process.cwd(), 'changelog'),
) => {
	const files = await readdir(join(root, id))
	const releases = await Promise.all(
		files.map(async file => {
			if (!versionPattern.test(file.replace(/\.md$/, '')) || !file.endsWith('.md')) {
				throw new Error(
					`changelog/${id}/${file}: name release files <version>.md, such as 1.2.3.md`,
				)
			}
			return parseRelease(await readFile(join(root, id, file), 'utf8'), `${id}/${file}`)
		}),
	)
	releases.sort((left, right) => compareVersions(right.version, left.version))
	for (const [index, release] of releases.entries()) {
		const older = releases[index + 1]
		if (older && older.date > release.date) {
			throw new Error(
				`changelog/${id}/${release.version}.md: dated ${release.date}, before ${older.version} on ${older.date}`,
			)
		}
	}
	return releases
}

/** The release files of one package up to the version in its `package.json`, newest first. */
const readPublishedReleases = async (
	item: (typeof packages)[number],
	root: string,
	packagesRoot: string,
) => {
	const manifest = join(packagesRoot, item.directory, 'package.json')
	const { version: published } = JSON.parse(await readFile(manifest, 'utf8')) as {
		version: string
	}
	return (await readPackageReleases(item.id, root)).filter(
		release => compareVersions(release.version, published) <= 0,
	)
}

const packageOf = (id: Types.PackageId) => packages.find(item => item.id === id)!

/** Where a package's changelog is served as Markdown, such as `/changelog/kirari.md`. */
export const changelogMarkdownPath = (id: Types.PackageId) => `/changelog/${id}.md`

/**
 * One package's published releases as Markdown for coding assistants, newest first, each release
 * file's body under a `## <version>` heading.
 */
export const readChangelogMarkdown = async (
	id: Types.PackageId,
	root = join(process.cwd(), 'changelog'),
	packagesRoot = join(process.cwd(), '..', '..', 'packages'),
) => {
	const item = packageOf(id)
	const releases = await readPublishedReleases(item, root, packagesRoot)
	return [
		`# ${item.name} changelog`,
		'',
		`Every published release of ${item.name}, newest first. Each breaking change ends with numbered migration steps.`,
		'',
		...releases.map(
			release => `## ${release.version} (${release.date})\n\n${release.body.trim()}\n`,
		),
	].join('\n')
}

/**
 * Every package's published releases, rendered on the server, newest first with the core package
 * first on the same day. Entries for versions newer than the package's `package.json` stay hidden
 * until that version is released.
 */
export const readReleases = async (
	root = join(process.cwd(), 'changelog'),
	packagesRoot = join(process.cwd(), '..', '..', 'packages'),
): Promise<Types.Release[]> => {
	const folders = (await readdir(root)).sort()
	const expected = packages.map(item => item.id).sort()
	if (folders.join() !== expected.join()) {
		throw new Error(
			`changelog/ must contain exactly the folders ${expected.join(', ')}; found ${folders.join(', ')}`,
		)
	}
	const releases = await Promise.all(
		packages.map(async item =>
			(await readPublishedReleases(item, root, packagesRoot)).map(release => {
				const id = `${item.id}-${release.version}`
				return {
					package: item.id,
					version: release.version,
					date: release.date,
					sections: categories
						.filter(category => release.sections[category.id].length)
						.map(category => ({
							category: category.id,
							content: renderSection(
								release.sections[category.id],
								`${id}-${category.id}`,
							),
						})),
				}
			}),
		),
	)
	return releases.flat().sort((left, right) => right.date.localeCompare(left.date))
}
