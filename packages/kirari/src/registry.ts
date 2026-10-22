import type { Language } from './types.js'

const aliases: Readonly<Record<string, readonly string[]>> = {
  c: ['h'],
  clojure: ['clj', 'cljs', 'cljc', 'edn'],
  cpp: ['c++', 'cc', 'cxx', 'hpp', 'hh', 'hxx'],
  csharp: ['c#', 'cs'],
  diff: ['patch'],
  dockerfile: ['docker'],
  dotenv: ['env'],
  elixir: ['ex', 'exs'],
  glsl: ['vert', 'frag', 'geom', 'comp', 'tesc', 'tese'],
  go: ['golang'],
  graphql: ['gql'],
  groovy: ['gradle'],
  hcl: ['tf', 'tfvars'],
  html: ['htm'],
  ini: ['cfg'],
  javascript: ['js', 'mjs', 'cjs'],
  julia: ['jl'],
  kotlin: ['kt', 'kts'],
  makefile: ['make', 'mk', 'gnumakefile'],
  markdown: ['md', 'mdown'],
  nginx: ['nginx.conf'],
  php: ['phtml'],
  plaintext: ['text', 'txt', 'plain'],
  powershell: ['ps1', 'psm1', 'psd1', 'pwsh'],
  protobuf: ['proto'],
  python: ['py', 'pyw', 'pyi'],
  ruby: ['rb', 'rake', 'gemspec', 'gemfile', 'rakefile'],
  rust: ['rs'],
  scala: ['sc'],
  shell: ['sh', 'bash', 'zsh', 'ksh', 'bashrc', 'zshrc'],
  typescript: ['ts', 'mts', 'cts'],
  xml: ['xsl', 'xsd', 'svg'],
  yaml: ['yml'],
}

export type LanguageRegistry = {
  resolve(input: string): Language | undefined
}

const normalize = (input: string): string => {
  return input.trim().toLowerCase().replace(/^\./, '')
}

export const createRegistry = (languages: readonly Language[]): LanguageRegistry => {
  const names = new Map<string, Language>()
  for (const language of languages) {
    const name = normalize(language.name)
    if (!name || names.has(name)) throw new Error(`Kirari: duplicate or empty language name ${JSON.stringify(language.name)}`)
    names.set(name, language)
  }
  const lookup = new Map(names)
  for (const [name, language] of names) {
    for (const alias of Object.hasOwn(aliases, name) ? aliases[name]! : []) {
      if (names.has(alias)) continue
      if (lookup.has(alias)) throw new Error(`Kirari: ambiguous language alias ${JSON.stringify(alias)}`)
      lookup.set(alias, language)
    }
  }

  return {
    resolve(input) {
      const key = input.trim().toLowerCase()
      const normalized = normalize(key)
      const direct = lookup.get(normalized)
      // An unregistered C# label must not become C after URL fragment removal.
      if (direct || normalized === 'c#') return direct
      const filename = key.split(/[?#]/, 1)[0]!.split(/[/\\]/).pop()!
      const name = normalize(filename)
      if (lookup.has(name)) return lookup.get(name)
      if (filename.startsWith('.env.')) return names.get('dotenv')
      if (name.startsWith('dockerfile.')) return names.get('dockerfile')
      const dot = name.lastIndexOf('.')
      return dot >= 0 ? lookup.get(name.slice(dot + 1)) : undefined
    },
  }
}
