import { afterAll, expect, test } from 'bun:test'
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { packages } from '@/features/changelog/changelog.data'
import { parseRelease, readChangelogMarkdown, readPackageReleases, readReleases, releaseTemplate } from '@/features/changelog/changelog.content'
import { Changelog } from '@/features/changelog/Changelog'
import { ClipboardProvider } from '@/components/ui/ClipboardProvider'

const releases = await readReleases()
const scratch = await mkdtemp(join(tmpdir(), 'kirari-changelog-test-'))
afterAll(() => rm(scratch, { recursive: true, force: true }))

const renderChangelog = (props: Parameters<typeof Changelog>[0]) =>
  renderToStaticMarkup(createElement(ClipboardProvider, null, createElement(Changelog, props)))

const frontmatter = (fields = 'package: kirari\nversion: 1.1.0\ndate: 2026-10-21') => `---\n${fields}\n---\n\n`
const body = (sections: { breaking?: string; improvements?: string; fixes?: string } = { fixes: '- Fixed.' }) =>
  [['Breaking changes', sections.breaking], ['Improvements', sections.improvements], ['Bug fixes', sections.fixes]]
    .filter(([, content]) => content !== undefined)
    .map(([label, content]) => `### ${label}\n\n${content}\n`)
    .join('\n')
const breaking = '#### Renamed `a`\n\nIt is `b` now.\n\n**How to migrate**\n\n1. Rename `a` to `b`.\n\n```ts before\na()\n```'
const parse = (source: string, path = 'kirari/1.1.0.md') => parseRelease(source, path)

test('every package CHANGELOG version has a release file', async () => {
  for (const item of packages) {
    const directory = `../../packages/${item.directory}`
    expect(JSON.parse(await readFile(`${directory}/package.json`, 'utf8')).name).toBe(item.name)
    const changelog = await readFile(`${directory}/CHANGELOG.md`, 'utf8')
    const listed = (await readPackageReleases(item.id)).map(release => release.version)
    for (const [, version] of changelog.matchAll(/^## (\d+\.\d+\.\d+)$/gm)) {
      expect(listed, `changelog/${item.id}/${version}.md`).toContain(version!)
    }
  }
})

test('a release file that follows the template parses into its three sections', () => {
  const parsed = parse(frontmatter() + body({ breaking, improvements: '- Faster.', fixes: '- Fixed.' }))
  expect(parsed).toMatchObject({ package: 'kirari', version: '1.1.0', date: '2026-10-21' })
  expect(parsed.sections.breaking.map(node => node.type)).toEqual(['heading', 'paragraph', 'paragraph', 'list', 'code'])
  expect(parsed.sections.improvements).toHaveLength(1)
  expect(parsed.sections.fixes).toHaveLength(1)
})

test('a release file may leave out sections without changes', () => {
  const parsed = parse(frontmatter() + body({ improvements: '- Faster.' }))
  expect(parsed.sections.breaking).toHaveLength(0)
  expect(parsed.sections.improvements).toHaveLength(1)
  expect(parsed.sections.fixes).toHaveLength(0)
})

test('the scaffold template fails until its sections are filled in or deleted', () => {
  const template = releaseTemplate('kirari-react', '2.0.0', '2026-11-01')
  expect(() => parse(template, 'kirari-react/2.0.0.md')).toThrow(/:7: Breaking changes: add changes, or delete the empty section/)
  const filled = template.replace('### Breaking changes\n\n', '').replace('### Improvements\n\n', '').replace('### Bug fixes\n', '### Bug fixes\n\n- Fixed.\n')
  expect(parse(filled, 'kirari-react/2.0.0.md').sections.fixes).toHaveLength(1)
})

const rejects: [string, string, RegExp][] = [
  ['a file without frontmatter', body(), /:1: start with frontmatter between "---" lines/],
  ['frontmatter that is not YAML', frontmatter('package: [kirari'), /frontmatter is not valid YAML/],
  ['an unknown frontmatter field', frontmatter('package: kirari\nversion: 1.1.0\ndate: 2026-10-21\ntitle: Big') + body(), /frontmatter block: Unrecognized key: "title"/],
  ['a missing frontmatter field', frontmatter('package: kirari\nversion: 1.1.0') + body(), /frontmatter date:/],
  ['an unknown package', frontmatter('package: kirari-vue\nversion: 1.1.0\ndate: 2026-10-21') + body(), /frontmatter package:/],
  ['a short version', frontmatter('package: kirari\nversion: 1.1\ndate: 2026-10-21') + body(), /frontmatter version:/],
  ['a date that does not exist', frontmatter('package: kirari\nversion: 1.1.0\ndate: 2026-02-30') + body(), /frontmatter date: use a real date as YYYY-MM-DD/],
  ['frontmatter that does not match the path', frontmatter('package: kirari\nversion: 1.2.0\ndate: 2026-10-21') + body(), /frontmatter says kirari\/1\.2\.0\.md/],
  ['a file without sections', frontmatter(), /add at least one section: "### Breaking changes", "### Improvements", "### Bug fixes"/],
  ['an unknown section', frontmatter() + '### Notes\n\n- More.\n', /:7: expected one of the sections/],
  ['sections out of order', frontmatter() + '### Bug fixes\n\n- Fixed.\n\n### Improvements\n\n- Faster.\n', /:11: "### Improvements" must come before "### Bug fixes"/],
  ['a section twice', frontmatter() + body() + '\n' + body(), /"### Bug fixes" appears twice/],
  ['an empty section', frontmatter() + body({ breaking: '', fixes: '- Fixed.' }), /:7: Breaking changes: add changes, or delete the empty section/],
  ['a section that says None.', frontmatter() + body({ breaking: 'None.', fixes: '- Fixed.' }), /:9: Breaking changes: delete the section instead of writing "None\."/],
  ['improvements as prose', frontmatter() + body({ improvements: 'Faster now.' }), /:9: Improvements: use one bullet list/],
  ['a breaking change without a title', frontmatter() + body({ breaking: 'Renamed things.' }), /start each change with a "####" title/],
  ['a breaking change without migration steps', frontmatter() + body({ breaking: '#### Renamed\n\nIt changed.' }), /add "\*\*How to migrate\*\*" followed by numbered steps/],
  ['bulleted migration steps', frontmatter() + body({ breaking: '#### Renamed\n\nIt changed.\n\n**How to migrate**\n\n- Rename it.' }), /follow "\*\*How to migrate\*\*" with numbered steps/],
  ['a breaking change without an explanation', frontmatter() + body({ breaking: '#### Renamed\n\n**How to migrate**\n\n1. Rename it.' }), /explain the change in a paragraph/],
  ['content after the last section', frontmatter() + body() + '\n## Notes\n\nMore.\n', /expected one of the sections/],
]

for (const [name, source, message] of rejects) {
  test(`release files reject ${name}`, () => {
    expect(() => parse(source)).toThrow(message)
  })
}

test('package folders reject misnamed files and dates that go back in time', async () => {
  const root = join(scratch, 'folders')
  await mkdir(join(root, 'kirari'), { recursive: true })
  await writeFile(join(root, 'kirari', 'notes.md'), body())
  await expect(readPackageReleases('kirari', root)).rejects.toThrow(/notes\.md: name release files <version>\.md/)
  await rm(join(root, 'kirari', 'notes.md'))
  await writeFile(join(root, 'kirari', '1.0.0.md'), frontmatter('package: kirari\nversion: 1.0.0\ndate: 2026-10-21') + body())
  await writeFile(join(root, 'kirari', '1.1.0.md'), frontmatter('package: kirari\nversion: 1.1.0\ndate: 2026-10-20') + body())
  await expect(readPackageReleases('kirari', root)).rejects.toThrow(/1\.1\.0\.md: dated 2026-10-20, before 1\.0\.0 on 2026-10-21/)
})

test('release files for versions not yet published stay off the site', async () => {
  const root = join(scratch, 'unreleased')
  for (const item of packages) {
    await mkdir(join(root, 'changelog', item.id), { recursive: true })
    await mkdir(join(root, 'packages', item.directory), { recursive: true })
    await writeFile(join(root, 'packages', item.directory, 'package.json'), JSON.stringify({ version: '1.0.0' }))
    await writeFile(join(root, 'changelog', item.id, '1.0.0.md'), frontmatter(`package: ${item.id}\nversion: 1.0.0\ndate: 2026-10-19`) + body())
  }
  await writeFile(join(root, 'changelog', 'kirari', '1.1.0.md'), frontmatter() + body())
  const listed = await readReleases(join(root, 'changelog'), join(root, 'packages'))
  expect(listed.map(entry => `${entry.package}@${entry.version}`).sort()).toEqual(['kirari-react@1.0.0', 'kirari-rehype@1.0.0', 'kirari@1.0.0'])
  await mkdir(join(root, 'changelog', 'kirari-vue'))
  await expect(readReleases(join(root, 'changelog'), join(root, 'packages'))).rejects.toThrow(/must contain exactly the folders kirari, kirari-react, kirari-rehype/)
})

test('the release file documented in RELEASING.md passes validation', async () => {
  const guide = await readFile('../../RELEASING.md', 'utf8')
  const example = guide.slice(guide.indexOf('````md\n') + 7, guide.lastIndexOf('````'))
  const parsed = parse(example, 'kirari-react/1.1.0.md')
  expect(parsed.sections.breaking.filter(node => node.type === 'code')).toHaveLength(2)
})

test('the site lists released versions newest first, with only categories that have changes', async () => {
  const dates = releases.map(entry => entry.date)
  expect(dates).toEqual([...dates].sort().reverse())
  for (const item of packages) {
    const { version } = JSON.parse(await readFile(`../../packages/${item.directory}/package.json`, 'utf8'))
    expect(releases.filter(entry => entry.package === item.id).map(entry => entry.version), item.id).toContain(version)
  }
  for (const entry of releases) expect(entry.sections.length, `${entry.package}@${entry.version}`).toBeGreaterThan(0)
  const react = releases.find(entry => entry.package === 'kirari-react' && entry.version === '1.0.0')!
  expect(react.sections.map(section => section.category)).toEqual(['breaking', 'improvements'])
})

test('breaking changes render their migration steps and highlighted commands', () => {
  const html = renderChangelog({ releases, active: 'kirari-react' })
  const start = html.indexOf('data-category="breaking"', html.indexOf('id="kirari-react-1.0.0"'))
  const section = html.slice(start, html.indexOf('data-category="improvements"', start))
  expect(section).toContain('<h4>Requires <code>@vortexlabs/kirari</code> 1.x</h4>')
  expect(section).toContain('<p data-migrate="true"><strong>How to migrate</strong></p>')
  expect(section.match(/<ol>[\s\S]*?<\/ol>/)![0].match(/<li>/g)).toHaveLength(2)
  expect(section).toContain('>Run<')
  expect(section).toMatch(/<span class="kirari-[a-z]+">npm<\/span>/)
})

test('renders one heading per release and inline code from Markdown', () => {
  const html = renderChangelog({ releases })
  expect(html.match(/<h1>/g)).toHaveLength(1)
  expect(html.match(/<h2 /g)).toHaveLength(releases.length)
  expect(html).toContain('<code>3#x</code>')
})

test('a package filter shows only that package and marks its link current', () => {
  const html = renderChangelog({ releases, active: 'kirari-rehype' })
  expect(html.match(/<h2 /g)).toHaveLength(releases.filter(entry => entry.package === 'kirari-rehype').length)
  expect(html).not.toContain('id="kirari-1.0.4"')
  expect(html).toMatch(/aria-current="page" href="\/changelog\/?\?package=kirari-rehype"[^>]*>kirari-rehype<span[^>]*>3<\/span>/)
  expect(renderChangelog({ releases })).toMatch(/aria-current="page" href="\/changelog\/?"/)
})

test('the Markdown changelog lists published releases newest first without frontmatter', async () => {
  const markdown = await readChangelogMarkdown('kirari-react')
  const versions = [...markdown.matchAll(/^## (\d+\.\d+\.\d+) \(\d{4}-\d{2}-\d{2}\)$/gm)].map(match => match[1])
  expect(versions).toEqual(releases.filter(entry => entry.package === 'kirari-react').map(entry => entry.version))
  expect(markdown).toStartWith('# @vortexlabs/kirari-react changelog')
  expect(markdown).toContain('**How to migrate**')
  expect(markdown).not.toMatch(/^package: /m)
})

test('the Markdown changelog leaves out versions newer than package.json', async () => {
  const root = join(scratch, 'markdown')
  for (const item of packages) await mkdir(join(root, 'changelog', item.id), { recursive: true })
  await mkdir(join(root, 'packages', 'kirari'), { recursive: true })
  await writeFile(join(root, 'packages', 'kirari', 'package.json'), '{"version":"1.1.0"}')
  await writeFile(join(root, 'changelog', 'kirari', '1.1.0.md'), frontmatter() + body())
  await writeFile(join(root, 'changelog', 'kirari', '1.2.0.md'), frontmatter('package: kirari\nversion: 1.2.0\ndate: 2026-10-22') + body())
  const markdown = await readChangelogMarkdown('kirari', join(root, 'changelog'), join(root, 'packages'))
  expect(markdown).toContain('## 1.1.0 (2026-10-21)')
  expect(markdown).not.toContain('1.2.0')
})
