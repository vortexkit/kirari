import type { Language } from 'kirari'

export type LanguageEntry = {
	id: string
	label: string
	group: 'Web' | 'Programming' | 'Data' | 'Configuration'
	language: Language
	sample: string
	filename: string
}
