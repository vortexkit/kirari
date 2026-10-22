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
import { CopyButton } from '@/components/ui/CopyButton'
import { Icon } from '@/components/ui/Icon'
import { Link } from '@/components/ui/Link'
import { site } from '@/lib/site'
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

const changeMarkdown = (body: string, nodes: Node[]) =>
	body.slice(nodes[0]!.position!.start.offset, nodes.at(-1)!.position!.end.offset)

/** Splits breaking changes at their `####` titles. */
const splitChanges = (nodes: Node[]) =>
	nodes.reduce<Node[][]>((changes, node) => {
		if (isHeading(node, 4)) changes.push([])
		changes.at(-1)!.push(node)
		return changes
	}, [])

/**
 * One prompt per breaking change that asks a coding assistant to apply it to the reader's
 * codebase, quoting the change exactly as the release file writes it.
 */
export const migrationPrompts = (release: ParsedRelease) =>
	splitChanges(release.sections.breaking).map(change =>
		[
			`I'm upgrading ${packageOf(release.package).name} to ${release.version} or later. Apply this breaking change to my codebase.`,
			'',
			'1. Search the codebase for code this change affects.',
			'2. Update each match by following the migration steps below.',
			'3. List the files you changed. If nothing is affected, say so and change nothing.',
			'',
			`The full changelog is at ${site.url}${changelogMarkdownPath(release.package)}.`,
			'',
			changeMarkdown(release.body, change),
		].join('\n'),
	)

/** The Codex mark in its brand gradient, which needs an id unique on the page. */
const CodexLogo = (props: { gradient: string }) => {
	const { gradient } = props
	return (
		<svg width={14} height={14} viewBox="3 3 18 18" aria-hidden="true">
			<path
				fill={`url(#${gradient})`}
				stroke="none"
				d="M9.064 3.344a4.578 4.578 0 012.285-.312c1 .115 1.891.54 2.673 1.275.01.01.024.017.037.021a.09.09 0 00.043 0 4.55 4.55 0 013.046.275l.047.022.116.057a4.581 4.581 0 012.188 2.399c.209.51.313 1.041.315 1.595a4.24 4.24 0 01-.134 1.223.123.123 0 00.03.115c.594.607.988 1.33 1.183 2.17.289 1.425-.007 2.71-.887 3.854l-.136.166a4.548 4.548 0 01-2.201 1.388.123.123 0 00-.081.076c-.191.551-.383 1.023-.74 1.494-.9 1.187-2.222 1.846-3.711 1.838-1.187-.006-2.239-.44-3.157-1.302a.107.107 0 00-.105-.024c-.388.125-.78.143-1.204.138a4.441 4.441 0 01-1.945-.466 4.544 4.544 0 01-1.61-1.335c-.152-.202-.303-.392-.414-.617a5.81 5.81 0 01-.37-.961 4.582 4.582 0 01-.014-2.298.124.124 0 00.006-.056.085.085 0 00-.027-.048 4.467 4.467 0 01-1.034-1.651 3.896 3.896 0 01-.251-1.192 5.189 5.189 0 01.141-1.6c.337-1.112.982-1.985 1.933-2.618.212-.141.413-.251.601-.33.215-.089.43-.164.646-.227a.098.098 0 00.065-.066 4.51 4.51 0 01.829-1.615 4.535 4.535 0 011.837-1.388zm3.482 10.565a.637.637 0 000 1.272h3.636a.637.637 0 100-1.272h-3.636zM8.462 9.23a.637.637 0 00-1.106.631l1.272 2.224-1.266 2.136a.636.636 0 101.095.649l1.454-2.455a.636.636 0 00.005-.64L8.462 9.23z"
			/>
			<defs>
				<linearGradient
					id={gradient}
					gradientUnits="userSpaceOnUse"
					x1="12"
					x2="12"
					y1="3"
					y2="21"
				>
					<stop stopColor="#b1a7ff" />
					<stop offset=".5" stopColor="#7a9dff" />
					<stop offset="1" stopColor="#3941ff" />
				</linearGradient>
			</defs>
		</svg>
	)
}

const renderBreaking = (release: ParsedRelease, id: string) => {
	const prompts = migrationPrompts(release)
	return splitChanges(release.sections.breaking).map((change, index) => (
		<Fragment key={change[0]!.position!.start.offset}>
			{renderSection(change, `${id}-${index}`)}
			<div data-ai-prompt="">
				<Icon name="sparkle" size={16} />
				<p>
					<strong>Migrate with an AI assistant</strong> Copy a prompt with these steps and
					paste it into{' '}
					<span data-assistant="claude">
						<Icon name="claude" size={14} />
						Claude
					</span>
					,{' '}
					<span data-assistant="cursor">
						<Icon name="cursor" size={14} />
						Cursor
					</span>
					, or{' '}
					<span data-assistant="codex">
						<CodexLogo gradient={`${id}-${index}-codex`} />
						Codex
					</span>{' '}
					in your project. It finds the affected code and updates it.
				</p>
				<CopyButton
					text={prompts[index]!}
					message="Migration prompt copied"
					variant="secondary"
				>
					Copy prompt
				</CopyButton>
			</div>
		</Fragment>
	))
}

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
							content:
								category.id === 'breaking'
									? renderBreaking(release, `${id}-${category.id}`)
									: renderSection(
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
