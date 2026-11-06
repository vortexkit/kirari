import { expect, test } from 'bun:test'
import { usageCode } from '@/features/playground/Playground/Playground.utilities'

test('exported examples preserve backticks, substitutions, and backslashes', () => {
  const source = 'const value = `hello ${1 + 1}\\world`'
  for (const usage of ['js', 'react', 'markdown'] as const) {
    const code = usageCode({ source, name: 'javascript', theme: 'dracula', usage })
    expect(code).toContain('\\`hello \\${1 + 1}\\\\world\\`')
    expect(code).toContain('kirari/themes/dracula.css')
  }
})

test('Markdown exports choose a fence longer than any fence inside the source', () => {
  const code = usageCode({ source: '````\nexample\n```', name: 'markdown', theme: 'daylight', usage: 'markdown' })
  expect(code).toContain('\\`'.repeat(5) + 'markdown\n')
  expect(code).toContain('\n' + '\\`'.repeat(5))
})
