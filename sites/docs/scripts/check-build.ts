import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { indexablePaths } from '@/lib/seo'
import { sections } from '@/lib/navigation'
import { readMarkdown } from '@/lib/content'
import { site } from '@/lib/site'
import { changelogMarkdownPath, readChangelogMarkdown } from '@/features/changelog/changelog.content'
import { packages } from '@/features/changelog/changelog.data'

const output = '.next/server/app'
const titles = new Set<string>()

const notFound = await readFile(`${output}/_not-found.html`, 'utf8')
assert.match(notFound, /<header\b/)
assert.match(notFound, /<footer\b/)
assert.match(notFound, /name="robots" content="noindex"/)
assert.match(notFound, /This page is out of bounds/)
assert.match(notFound, /Read the docs/)
assert.doesNotMatch(notFound, /aria-current="page"/)

for (const path of indexablePaths) {
  const file = path === '/' ? 'index' : path.slice(1, -1)
  const html = await readFile(`${output}/${file}.html`, 'utf8')
  assert.match(html, /<!doctype html>/i)
  assert.equal((html.match(/<h1\b/g) ?? []).length, 1, `${path}: one visible page heading`)
  assert.ok(html.includes(`rel="canonical" href="${site.url}${path}"`), `${path}: canonical URL`)
  assert.match(html, /name="description" content="[^"]+"/)
  assert.ok(html.includes(`name="author" content="${site.author.name}"`), `${path}: author credit`)
  assert.ok(html.includes(`rel="author" href="${site.author.url}"`), `${path}: author profile`)
  assert.match(html, /property="og:image"/)
  assert.match(html, /name="twitter:card" content="summary_large_image"/)
  assert.ok(!html.includes('content="noindex"'), `${path}: indexable`)
  const title = html.match(/<title>(.*?)<\/title>/)![1]!
  assert.ok(title.includes('Kirari'), `${path}: title identifies the library`)
  assert.ok(!titles.has(title), `${path}: unique title`)
  titles.add(title)
  assert.ok(html.includes('kirari-'), `${path}: highlighted content in the initial HTML`)
  assert.doesNotMatch(html, /class="[^"]*\bundefined\b/, `${path}: CSS Module classes resolved`)
  if (path.startsWith('/docs/')) {
    assert.ok(html.includes('id="copy-page"'), `${path}: page copy control rendered`)
    if (path === '/docs/') assert.ok(!html.includes('class="breadcrumbs"'), 'Overview omits a redundant breadcrumb')
    else {
      const breadcrumb = html.match(/<nav class="breadcrumbs"[\s\S]*?<\/nav>/)?.[0]
      assert.ok(breadcrumb, `${path}: breadcrumb rendered`)
      assert.ok(breadcrumb.includes('aria-current="page"'), `${path}: current breadcrumb rendered`)
      assert.ok(!breadcrumb.includes('Kirari'), `${path}: breadcrumb starts at Docs`)
    }
  }
}

for (const section of sections) {
  const text = await readFile(`${output}/markdown/${section.id}.body`, 'utf8')
  assert.equal(text, await readMarkdown(section.id), `${section.id}: published Markdown matches source`)
  const path = section.id === 'overview' ? 'docs' : `docs/${section.id}`
  const html = await readFile(`${output}/${path}.html`, 'utf8')
  assert.ok(html.includes(`href="/docs/${section.id}.md"`), `${section.id}: Markdown download link`)
  const index = sections.indexOf(section)
  assert.equal(html.includes('rel="prev"'), index > 0, `${section.id}: previous guide boundary`)
  assert.equal(html.includes('rel="next"'), index < sections.length - 1, `${section.id}: next guide boundary`)
}

const sitemap = await readFile(`${output}/sitemap.xml.body`, 'utf8')
for (const path of indexablePaths) assert.ok(sitemap.includes(`<loc>${site.url}${path}</loc>`))
assert.equal((sitemap.match(/<loc>/g) ?? []).length, indexablePaths.length)
const robots = await readFile(`${output}/robots.txt.body`, 'utf8')
assert.ok(robots.includes(`Sitemap: ${site.url}/sitemap.xml`))
assert.ok(robots.includes('Allow: /'))
const llms = await readFile(`${output}/llms-full.txt.body`, 'utf8')
for (const section of sections) assert.ok(llms.includes(await readMarkdown(section.id)))
const index = await readFile(`${output}/llms.txt.body`, 'utf8')
for (const item of packages) {
  const markdown = await readChangelogMarkdown(item.id)
  const text = await readFile(`${output}/markdown/changelog/${item.id}.body`, 'utf8')
  assert.equal(text, markdown, `${item.id}: published changelog Markdown matches source`)
  assert.ok(llms.includes(markdown), `${item.id}: changelog in the complete documentation`)
  assert.ok(index.includes(`${site.url}${changelogMarkdownPath(item.id)}`), `${item.id}: changelog listed in llms.txt`)
}

console.log(`Verified ${indexablePaths.length} prerendered pages, ${sections.length + packages.length} Markdown endpoints, sitemap, robots, and LLM documentation.`)
