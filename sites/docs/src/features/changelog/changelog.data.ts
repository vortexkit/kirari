import type * as Types from './changelog.types'

export const categories = [
	{
		id: 'breaking',
		label: 'Breaking changes',
	},
	{
		id: 'improvements',
		label: 'Improvements',
	},
	{
		id: 'fixes',
		label: 'Bug fixes',
	},
] as const

/** `id` is the `?package=` filter value and the changelog folder; `directory` is the folder under `packages/`. */
export const packages = [
	{
		id: 'kirari',
		name: 'kirari',
		directory: 'kirari',
	},
	{
		id: 'kirari-react',
		name: 'kirari-react',
		directory: 'react',
	},
	{
		id: 'kirari-rehype',
		name: 'kirari-rehype',
		directory: 'rehype',
	},
] as const

export const isPackageId = (value: string | null): value is Types.PackageId =>
	packages.some(item => item.id === value)
