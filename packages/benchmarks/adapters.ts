import { render, tokenize } from 'kirari/core'
import { javascript } from 'kirari/languages/javascript'
import { typescript } from 'kirari/languages/typescript'
import { tsx } from 'kirari/languages/tsx'
import { python } from 'kirari/languages/python'
import { json } from 'kirari/languages/json'
import { shell } from 'kirari/languages/shell'

export const languageNames = ['javascript', 'typescript', 'tsx', 'python', 'json', 'shell'] as const
export type LanguageName = typeof languageNames[number]
const languages = { javascript, typescript, tsx, python, json, shell }

export const highlight = (source: string, language: LanguageName) => render(tokenize(source, languages[language]))

// A browser bundle with the same callable surface and only the requested languages.
export const bundleEntry = (names: readonly LanguageName[]): string => {
  const definitions = names.map((name, index) => `import {${name} as language${index}} from 'kirari/languages/${name}';`).join('\n')
  const registry = names.map((name, index) => `${JSON.stringify(name)}:language${index}`).join(',')
  return `import {tokenize,render} from 'kirari/core';\n${definitions}\nconst languages={${registry}};
export const highlight = (source, language = 'javascript') => render(tokenize(source, languages[language]));`
}
