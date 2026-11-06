import { expect, test } from 'bun:test'
import { javascript } from 'kirari/languages/javascript'
import { json } from 'kirari/languages/json'
import { highlight } from '../adapters.js'
import { textFromHTML } from '../benchmark.js'
import { diagnosticStreamingInputs, prepareCheckpointReplay, prepareReplay, replay, replayCheckpoint, streamingInputs, updateEnds } from '../streaming.js'

test('update schedules flush the final prefix once for exact and ragged chunks', () => {
  expect(updateEnds(12, 3)).toEqual([3, 6, 9, 12])
  expect(updateEnds(10, 3)).toEqual([3, 6, 9, 10])
  expect(updateEnds(12, 3, 2)).toEqual([6, 12])
  expect(updateEnds(10, 3, 2)).toEqual([6, 10])
  expect(updateEnds(10, 3, 4)).toEqual([10])
  expect(updateEnds(2, 16)).toEqual([2])
  expect(updateEnds(10, Number.MAX_SAFE_INTEGER, Number.MAX_SAFE_INTEGER)).toEqual([10])
  expect(updateEnds(0, 3)).toEqual([])
})

test('update schedules reject invalid lengths and chunk counts', () => {
  for (const length of [-1, 0.5, NaN, Infinity, Number.MAX_SAFE_INTEGER + 1]) {
    expect(() => updateEnds(length, 3)).toThrow()
  }
  for (const count of [0, -1, 0.5, NaN, Infinity, Number.MAX_SAFE_INTEGER + 1]) {
    expect(() => updateEnds(10, count)).toThrow()
    expect(() => updateEnds(10, 3, count)).toThrow()
  }
})

test('prepared replays count all full-prefix work', () => {
  expect(prepareReplay('0123456789', updateEnds(10, 3))).toEqual({
    prefixes: ['012', '012345', '012345678', '0123456789'],
    calls: 4,
    processedCodeUnits: 28,
  })
  expect(prepareReplay('', [])).toEqual({ prefixes: [], calls: 0, processedCodeUnits: 0 })
})

test('prepared replays reject missing final updates and invalid endpoints', () => {
  for (const ends of [[], [2], [0, 4], [-1, 4], [1.5, 4], [NaN, 4], [Infinity, 4], [5], [2, 2, 4], [3, 2, 4]]) {
    expect(() => prepareReplay('test', ends)).toThrow()
  }
  expect(() => prepareReplay('', [0])).toThrow()
})

test('chunk sizes use UTF-16 units, including split surrogate pairs', () => {
  expect(prepareReplay('A🙂B', updateEnds(4, 2))).toEqual({
    prefixes: ['A\ud83d', 'A🙂B'], calls: 2, processedCodeUnits: 6,
  })
})

test('replay visits each prefix, consumes each output, and resets between calls', () => {
  const prefixes = ['a', 'ab', 'abc']
  const outputs = ['first', 'middle', 'last']
  const visits: string[] = []
  const highlight = (source: string) => {
    visits.push(source)
    return outputs[prefixes.indexOf(source)]!
  }
  const expected = {
    html: 'last',
    checksum: outputs.reduce((sum, output) => (sum + output.length + output.charCodeAt(output.length >>> 1)) | 0, 0),
  }
  expect(replay(prefixes, highlight)).toEqual(expected)
  expect(replay(prefixes, highlight)).toEqual(expected)
  expect(visits).toEqual([...prefixes, ...prefixes])
  expect(replay([], () => { throw new Error('Empty replay called the highlighter') })).toEqual({ html: '', checksum: 0 })
})

test('replay propagates highlighting failures and stops processing', () => {
  const visits: string[] = []
  expect(() => replay(['a', 'ab', 'abc'], source => {
    visits.push(source)
    if (source === 'ab') throw new Error('highlight failed')
    return source
  })).toThrow('highlight failed')
  expect(visits).toEqual(['a', 'ab'])
})

test('streaming fixtures cover both languages and remain complete syntax', () => {
  const inputs = streamingInputs()
  expect(inputs).toHaveLength(6)
  expect(new Set(inputs.map(input => input.id)).size).toBe(inputs.length)
  for (const language of ['javascript', 'json']) {
    expect(inputs.filter(input => input.language === language).map(input => input.targetCodeUnits).sort((a, b) => a - b))
      .toEqual([1024, 4096, 16384])
  }
  for (const input of inputs) {
    expect(input.source.length).toBeGreaterThanOrEqual(input.targetCodeUnits)
    if (input.language === 'json') expect(() => JSON.parse(input.source)).not.toThrow()
    else expect(() => new Function(input.source)).not.toThrow()
  }
})

test('Kirari preserves every UTF-16 prefix and replay ends with the full-input HTML', () => {
  const source = 'const label = `A🙂 ${1 < 2 ? "&" : ">"}`;\r\n/* incomplete 🚧'
  const { prefixes } = prepareReplay(source, updateEnds(source.length, 1))
  const highlightPrefix = (prefix: string) => highlight(prefix, 'javascript')
  for (const prefix of prefixes) expect(textFromHTML(highlightPrefix(prefix))).toBe(prefix)
  expect(replay(prefixes, highlightPrefix).html).toBe(highlightPrefix(source))
})

test('checkpoint replay validates every patch and starts a new stream for each response', () => {
  for (const [source, language] of [
    ['const label = `A🙂 ${1 < 2 ? "&" : ">"}`;\r\ncall\n\n()', javascript],
    ['{\n"🙂"\n : true,\n"other": "<&>"\n}', json],
  ] as const) {
    const ends = updateEnds(source.length, 1)
    const prepared = prepareCheckpointReplay(source, ends, language)
    expect(prepared.chunks.join('')).toBe(source)
    expect(prepared.chunks).toHaveLength(ends.length)
    expect(prepared.calls).toBe(ends.length)
    const first = replayCheckpoint(prepared.chunks, language)
    expect(first.processedCodeUnits).toBe(prepared.processedCodeUnits)
    expect(replayCheckpoint(prepared.chunks, language)).toEqual(first)
  }
  expect(prepareCheckpointReplay('', [], json)).toEqual({ chunks: [], calls: 0, processedCodeUnits: 0 })
  expect(replayCheckpoint([], json)).toEqual({ checksum: 0, processedCodeUnits: 0 })
})

test('checkpoint work decreases on closed lines but remains full-prefix on adverse tails', () => {
  const source = 'const value = 42;\n'.repeat(32)
  const ends = updateEnds(source.length, 16)
  const full = prepareReplay(source, ends)
  const checkpoint = prepareCheckpointReplay(source, ends, javascript)
  expect(checkpoint.processedCodeUnits).toBeLessThan(full.processedCodeUnits / 4)

  const diagnostics = diagnosticStreamingInputs()
  expect(diagnostics).toHaveLength(2)
  expect(diagnostics.map(input => input.diagnostic)).toEqual(['single line', 'open multiline comment'])
  for (const input of diagnostics) {
    expect(input.source.length).toBeGreaterThanOrEqual(input.targetCodeUnits)
    const diagnosticEnds = updateEnds(input.source.length, 64)
    const prepared = prepareCheckpointReplay(input.source, diagnosticEnds, javascript)
    expect(prepared.processedCodeUnits).toBe(prepareReplay(input.source, diagnosticEnds).processedCodeUnits)
    expect(replayCheckpoint(prepared.chunks, javascript).processedCodeUnits).toBe(prepared.processedCodeUnits)
  }
})
