import { GlobalRegistrator } from '@happy-dom/global-registrator'
import { afterAll, beforeAll, expect, test } from 'bun:test'
import { StrictMode, act } from 'react'
import type { Root } from 'react-dom/client'
import { tokenize } from 'kirari/core'
import type { Language } from 'kirari/core'
import { javascript } from 'kirari/languages/javascript'
import { python } from 'kirari/languages/python'
import { Code } from '../src/index.js'
import { useTokenStream } from '../src/stream.js'
import type { StreamedTokens } from '../src/stream.js'

let createRoot: typeof import('react-dom/client').createRoot
beforeAll(async () => {
  GlobalRegistrator.register()
  Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true })
  createRoot = (await import('react-dom/client')).createRoot
})
afterAll(() => GlobalRegistrator.unregister())

type Handle = { current?: StreamedTokens }

const Streamed = ({ language, handle }: { language: Language, handle: Handle }) => {
  handle.current = useTokenStream(language)
  return <Code language={language} tokens={handle.current.tokens} />
}

const mount = (language: Language) => {
  const container = document.createElement('div')
  let root!: Root
  const handle: Handle = {}
  const render = (language: Language) => act(() => root.render(<StrictMode><Streamed language={language} handle={handle} /></StrictMode>))
  act(() => { root = createRoot(container) })
  render(language)
  return { container, handle, render, unmount: () => act(() => root.unmount()) }
}

const source = 'const answer = items.map(item => item.value * 2) // "done"\n'

test('chunks written through the hook render the same tokens as a full scan', () => {
  const view = mount(javascript)
  for (let index = 0; index < source.length; index += 5) act(() => view.handle.current!.write(source.slice(index, index + 5)))
  act(() => view.handle.current!.end())
  expect(view.handle.current!.tokens).toEqual(tokenize(source, javascript))
  expect(view.container.textContent).toBe(source)
  expect(view.container.querySelector('.kirari-keyword')?.textContent).toBe('const')
  view.unmount()
})

test('reset clears tokens and allows writing again after end', () => {
  const view = mount(javascript)
  act(() => view.handle.current!.end('let a = 1'))
  act(() => view.handle.current!.reset())
  expect(view.container.textContent).toBe('')
  act(() => view.handle.current!.end('x = 2'))
  expect(view.container.textContent).toBe('x = 2')
  view.unmount()
})

test('changing language starts a fresh stream', () => {
  const view = mount(javascript)
  act(() => view.handle.current!.write('const a = 1'))
  view.render(python)
  expect(view.handle.current!.tokens).toEqual([])
  act(() => view.handle.current!.end('def f(): pass'))
  expect(view.handle.current!.tokens).toEqual(tokenize('def f(): pass', python))
  view.unmount()
})
