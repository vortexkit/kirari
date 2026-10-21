import type { Element, ElementContent, Root } from 'hast'
import { tokenize } from '@vortexlabs/kirari/core'
import type { Language, RenderOptions } from '@vortexlabs/kirari/core'
import { createRegistry } from '@vortexlabs/kirari/registry'
import type { LanguageRegistry } from '@vortexlabs/kirari/registry'
import { lineRanges } from './metadata.js'
import { classes, tokenNodes } from './render.js'

export interface Options extends RenderOptions {
  readonly languages?: readonly Language[]
  readonly lines?: boolean
  readonly lineClassName?: (line: { readonly number: number; readonly start: number; readonly end: number }) => string | undefined
}

const optsOut = (classNames: readonly string[]): boolean => {
  return classNames.some(name => name === 'no-highlight' || name === 'nohighlight')
}

/** Replaces the text of a `<code>` with highlighted nodes; returns whether it did. */
const highlightCode = (code: ElementContent, registry: LanguageRegistry, options: Options): boolean => {
  if (code.type !== 'element' || code.tagName !== 'code' || code.children.some(node => node.type !== 'text')) return false
  const codeClasses = classes(code.properties.className)
  if (optsOut(codeClasses)) return false
  const language = codeClasses.filter(name => name.startsWith('language-')).map(name => registry.resolve(name.slice(9))).find(Boolean)
  if (!language) return false
  const source = code.children.map(node => node.type === 'text' ? node.value : '').join('')
  const meta = code.data && 'meta' in code.data ? code.data.meta : undefined
  code.children = tokenNodes(source, tokenize(source, language), options, lineRanges(meta))
  return true
}

const rehypeKirari = (options: Options = {}): (tree: Root) => undefined => {
  const registry = createRegistry(options.languages ?? [])
  return tree => {
    const parents: (Root | Element)[] = [tree]
    while (parents.length) {
      const parent = parents.pop()!
      for (const child of parent.children) {
        if (child.type === 'element' && child.tagName === 'pre') {
          const preClasses = classes(child.properties.className)
          if (optsOut(preClasses)) continue
          for (const code of child.children) {
            if (highlightCode(code, registry, options)) child.properties.className = [...new Set([...preClasses, 'kirari'])]
          }
          continue
        }
        // MDX JSX nodes can contain normal HAST children without being elements themselves.
        if ('children' in child && Array.isArray(child.children)) parents.push(child as Element)
      }
    }
    return undefined
  }
}
export default rehypeKirari
