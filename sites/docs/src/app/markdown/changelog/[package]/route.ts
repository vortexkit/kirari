import { readChangelogMarkdown } from '@/features/changelog/changelog.content'
import { isPackageId, packages } from '@/features/changelog/changelog.data'
import { routes } from '@/lib/navigation'
import { site } from '@/lib/site'
import type * as Types from './route.types'

export const dynamic = 'force-static'
export const dynamicParams = false
export const generateStaticParams = () =>
	packages.map(item => ({
		package: item.id,
	}))

export const GET = async (_request: Request, context: Types.Context) => {
	const { params } = context
	const { package: id } = await params
	if (!isPackageId(id))
		return new Response('Not found', {
			status: 404,
		})
	return new Response(await readChangelogMarkdown(id), {
		headers: {
			'Content-Type': 'text/markdown; charset=utf-8',
			'X-Robots-Tag': 'noindex',
			Link: `<${site.url}${routes.changelog}?package=${id}>; rel="canonical"`,
		},
	})
}
