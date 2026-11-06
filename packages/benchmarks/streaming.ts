import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { mkdir } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { render, tokenize } from 'kirari/core'
import { createTokenStream } from 'kirari/stream'
import { javascript } from 'kirari/languages/javascript'
import { json } from 'kirari/languages/json'
import type { Language, Token } from 'kirari/core'
import { corpus } from '../kirari/test/corpus/fixtures.js'
import { measurementEnvironment, summarize, textFromHTML } from './benchmark.js'

export const streamingInputs = () => {
  return (['javascript', 'json'] as const).flatMap(language => {
    const parts = corpus.filter(fixture => fixture.language === language).slice(0, 3).map(fixture => fixture.source)
    const unit = language === 'javascript'
      ? `{\n${parts.map(source => source.replace(/^export /, '')).join('\n')}\n}\n`
      : parts.join(',\n')
    const prefix = language === 'json' ? '[\n' : ''
    const suffix = language === 'json' ? '\n]' : ''
    const separator = language === 'json' ? ',\n' : ''
    return [1024, 4096, 16384].map(targetCodeUnits => {
      const repeats = Math.ceil((targetCodeUnits - prefix.length - suffix.length + separator.length) / (unit.length + separator.length))
      return { id: `${language}-${targetCodeUnits}`, language, targetCodeUnits,
        source: prefix + Array(repeats).fill(unit).join(separator) + suffix }
    })
  })
}

export const diagnosticStreamingInputs = () => {
  return [
    { id: 'javascript-long-line-4096', language: 'javascript' as const, targetCodeUnits: 4096,
      diagnostic: 'single line', source: 'const values = [' + '1,'.repeat(2048) + '0];' },
    { id: 'javascript-open-comment-4096', language: 'javascript' as const, targetCodeUnits: 4096,
      diagnostic: 'open multiline comment', source: '/* ' + 'comment\n'.repeat(512) },
  ]
}

export const updateEnds = (length: number, chunkUnits: number, everyChunks = 1): number[] => {
  assert.ok(Number.isSafeInteger(length) && length >= 0, 'Invalid source length')
  assert.ok(Number.isSafeInteger(chunkUnits) && chunkUnits > 0, 'Invalid chunk size')
  assert.ok(Number.isSafeInteger(everyChunks) && everyChunks > 0, 'Invalid coalescing count')
  const step = chunkUnits * everyChunks
  const ends = []
  for (let end = step; end < length; end += step) ends.push(end)
  if (length > 0) ends.push(length)
  return ends
}

export const prepareReplay = (source: string, ends: readonly number[]) => {
  let previous = 0
  let processedCodeUnits = 0
  const prefixes = ends.map(end => {
    assert.ok(Number.isSafeInteger(end) && end > previous && end <= source.length, 'Invalid update endpoint')
    previous = end
    processedCodeUnits += end
    return source.slice(0, end)
  })
  assert.equal(previous, source.length, 'Stream must flush the final source exactly once')
  return { prefixes, calls: ends.length, processedCodeUnits }
}

export const replay = (prefixes: readonly string[], highlight: (source: string) => string) => {
  let html = ''
  let checksum = 0
  for (const prefix of prefixes) {
    html = highlight(prefix)
    checksum = (checksum + html.length + (html.length ? html.charCodeAt(html.length >>> 1) : 0)) | 0
  }
  return { html, checksum }
}

export const replayCheckpoint = (chunks: readonly string[], language: Language) => {
  const stream = createTokenStream(language)
  let checksum = 0
  let processedCodeUnits = 0
  for (const chunk of chunks) {
    const patch = stream.write(chunk)
    const html = render(patch.tokens)
    processedCodeUnits += patch.length - patch.from
    checksum = (checksum + html.length + (html.length ? html.charCodeAt(html.length >>> 1) : 0)) | 0
  }
  stream.end()
  return { checksum, processedCodeUnits }
}

export const prepareCheckpointReplay = (source: string, ends: readonly number[], language: Language) => {
  const { prefixes, calls } = prepareReplay(source, ends)
  const chunks = prefixes.map((prefix, index) => prefix.slice(prefixes[index - 1]?.length ?? 0))
  const stream = createTokenStream(language)
  let tokens: readonly Token[] = []
  let processedCodeUnits = 0
  for (const [index, chunk] of chunks.entries()) {
    const patch = stream.write(chunk)
    const prefix = prefixes[index]!
    assert.equal(patch.length, prefix.length)
    assert.ok(patch.from === 0 || tokens.some(token => token.end === patch.from), 'Patch must start at a token boundary')
    tokens = [...tokens.filter(token => token.start < patch.from), ...patch.tokens]
    const expected = tokenize(prefix, language)
    assert.deepEqual(tokens, expected, `Checkpoint tokens differ at offset ${prefix.length}`)
    assert.equal(render(tokens), render(expected), `Checkpoint HTML differs at offset ${prefix.length}`)
    assert.equal(textFromHTML(render(tokens)), prefix, `Invalid escaped prefix at offset ${prefix.length}`)
    processedCodeUnits += patch.length - patch.from
  }
  stream.end()
  return { chunks, calls, processedCodeUnits }
}

const policies = (source: string) => {
  return [
    { policy: 'final-only', chunkUnits: null, everyChunks: null, ends: [source.length] },
    ...[16, 64, 256].flatMap(chunkUnits => [1, 4].map(everyChunks => ({
      policy: everyChunks === 1 ? 'every-chunk' : 'every-4-chunks', chunkUnits, everyChunks,
      ends: updateEnds(source.length, chunkUnits, everyChunks),
    }))),
  ].map(policy => ({ ...policy, ...prepareReplay(source, policy.ends) }))
}

export const main = async () => {
  assert.ok(process.argv.slice(2).every(argument => argument === '--quick'), 'Only --quick is supported')
  const quick = process.argv.includes('--quick')
  const rounds = quick ? 3 : 5
  const targetMs = quick ? 2 : 20
  const allInputs = [...streamingInputs(), ...diagnosticStreamingInputs()]
  const inputs = quick ? allInputs.filter(input => input.targetCodeUnits === 1024 || 'diagnostic' in input) : allInputs
  const environment = await measurementEnvironment()
  const workloadSHA256 = createHash('sha256').update(JSON.stringify(inputs)).digest('hex')
  const runnerSHA256 = createHash('sha256').update(await Bun.file(fileURLToPath(import.meta.url)).text()).digest('hex')
  const results = []
  let checksum = 0
  for (const [inputIndex, input] of inputs.entries()) {
    const language = { javascript, json }[input.language]
    const highlight = (source: string) => render(tokenize(source, language))
    const finalHTML = highlight(input.source)
    const plans = policies(input.source).flatMap(policy => {
      const checkpoint = prepareCheckpointReplay(input.source, policy.ends, language)
      assert.equal(replay(policy.prefixes, highlight).html, finalHTML, `${input.id}: incorrect final flush`)
      assert.equal(replayCheckpoint(checkpoint.chunks, language).processedCodeUnits, checkpoint.processedCodeUnits)
      return [
        { ...policy, strategy: 'full-prefix', run: () => replay(policy.prefixes, highlight).checksum },
        { ...policy, strategy: 'checkpoint', processedCodeUnits: checkpoint.processedCodeUnits, run: () => {
          const output = replayCheckpoint(checkpoint.chunks, language)
          return (output.checksum + output.processedCodeUnits) | 0
        } },
      ].map(plan => ({ ...plan, samples: [] as number[], iterations: 1, calibrated: false }))
    })
    const batch = (run: () => number, iterations: number) => {
      const start = performance.now()
      for (let iteration = 0; iteration < iterations; iteration++) {
        checksum = (checksum + run()) | 0
      }
      return performance.now() - start
    }
    const ordered = (round: number) => {
      const offset = (round + inputIndex) % plans.length
      const order = [...plans.slice(offset), ...plans.slice(0, offset)]
      return round % 2 ? order.reverse() : order
    }
    for (let round = 0; plans.some(plan => !plan.calibrated); round++) {
      for (const plan of ordered(round)) {
        if (plan.calibrated) continue
        const elapsed = batch(plan.run, plan.iterations)
        if (elapsed < targetMs && plan.iterations < 4096) plan.iterations *= 2
        else {
          plan.iterations = Math.max(1, Math.min(4096, Math.ceil(plan.iterations * targetMs / Math.max(elapsed, 0.001))))
          plan.calibrated = true
        }
      }
    }
    for (let round = 0; round < rounds; round++) {
      for (const plan of ordered(round)) plan.samples.push(batch(plan.run, plan.iterations) / plan.iterations)
    }
    const finalOnlyMedian = summarize(plans[0]!.samples).medianMs
    for (const plan of plans) {
      const stats = summarize(plan.samples)
      results.push({ id: input.id, language: input.language, targetCodeUnits: input.targetCodeUnits,
        inputCodeUnits: input.source.length, inputBytes: Buffer.byteLength(input.source),
        diagnostic: 'diagnostic' in input ? input.diagnostic : null,
        strategy: plan.strategy, policy: plan.policy, chunkUnits: plan.chunkUnits, everyChunks: plan.everyChunks,
        incomingChunks: plan.chunkUnits === null ? null : Math.ceil(input.source.length / plan.chunkUnits),
        highlightCalls: plan.calls, processedCodeUnits: plan.processedCodeUnits,
        workAmplification: plan.processedCodeUnits / input.source.length,
        finalOutputBytes: Buffer.byteLength(finalHTML), iterationsPerSample: plan.iterations,
        ...stats, timeVsFinalOnly: stats.medianMs / finalOnlyMedian })
    }
    console.log(`Measured ${input.id}: ${input.source.length} UTF-16 units, ${Buffer.byteLength(input.source)} bytes`)
  }
  const report = { environment, mode: quick ? 'quick smoke run' : 'measurement',
    rounds, targetBatchMs: targetMs, workloadSHA256, runnerSHA256, checksum,
    order: 'Rotate strategy/policy order by (round + input index), reverse on odd rounds during calibration and measurement; fixed input order.', results }
  const output = new URL('results/', import.meta.url)
  await mkdir(output, { recursive: true })
  const filename = quick ? 'streaming-quick' : 'streaming-latest'
  await Bun.write(new URL(`${filename}.json`, output), JSON.stringify(report, null, 2) + '\n')
  const lines = [
    '# Kirari streaming workload comparison', '',
    `${environment.timestamp} · ${environment.runtime} · ${environment.cpu} · ${environment.os} ${environment.architecture}`, '',
    `Mode: **${report.mode}**. Kirari ${environment.versions.kirari}. ${rounds} measured batches, calibrated toward ${targetMs} ms each (1–4,096 replays).`, '',
    'This compares full-prefix tokenization/rendering with the optional checkpoint stream API, rendering only replacement tokens for each update. Both strategies receive the same source and update schedule.',
    'Every chunk and every four chunks receive the same source, with a final flush exactly once. Final-only produces no intermediate display and is a reference cost, not a usable live-preview strategy.', '',
    'Chunks are UTF-16 code units, not UTF-8 bytes or model tokens. Sizes are minimum targets; whole fixture units are retained. Corpus JavaScript units have block scope and JSON units form one valid array. Two separate 4K diagnostics use a single long JavaScript line and an unfinished multiline comment to expose rescanning limits.',
    'Prefix strings, chunks, and update schedules are prepared before timing. Outside timing, every checkpoint patch is applied and checked for exact token and HTML equality with batch tokenization, including lossless escaped text. Each policy flushes the final input.',
    'Every checkpoint replay creates a fresh stream. Timing includes source accumulation, stream/tokenizer/render calls, work counting, loop/dispatch overhead, and consuming rendered output length/middle character. The checkpoint path renders patch.tokens only: it does not reconstruct a full token array or full HTML in timed loops.',
    'Payloads differ: full-prefix output replaces the whole code block, while checkpoint output replaces a suffix identified by its source offset. Consumer patch application, DOM updates, network/arrival cadence, and full-view reconstruction are excluded. Final HTML byte counts describe the reconstructed result, not cumulative transmitted payload.',
    'Values are medians of batch means per complete response, not per-update latency percentiles. Strategies and policies rotate and reverse during both calibration and measurement. There is no explicit GC; allocation and shared-process GC affect results. Coalescing reduces visible update frequency. Raw samples and hashes are in the JSON report.', '',
    '| Input | Strategy | UTF-16 units | UTF-8 bytes | Chunk units | Policy | Calls | Work × input | Median ms/response | Min–max ms | Time × full final-only |',
    '| --- | --- | ---: | ---: | ---: | --- | ---: | ---: | ---: | ---: | ---: |',
    ...results.map(row => `| ${row.id} | ${row.strategy} | ${row.inputCodeUnits} | ${row.inputBytes} | ${row.chunkUnits ?? '—'} | ${row.policy} | ${row.highlightCalls} | ${row.workAmplification.toFixed(2)} | ${row.medianMs.toFixed(3)} | ${row.minMs.toFixed(3)}–${row.maxMs.toFixed(3)} | ${row.timeVsFinalOnly.toFixed(2)} |`), '',
    'Work amplification is summed full-prefix lengths or summed (patch.length − patch.from), divided by final source length. It describes submitted scan ranges, not CPU instructions or all string-copy/allocation work.', '',
    'Limits: synthetic fixed-size chunks, two languages, one Bun process, no browser timing or memory profile. Checkpoints apply only to unchanged built-in JavaScript/TypeScript/JSON definitions; other definitions use full-prefix fallback. A long line or unfinished multiline construct can leave an expensive tail, and streams retain source in memory. These results do not establish universal incremental performance. Quick runs cover the smallest corpus inputs plus both diagnostics and are harness checks, not scaling evidence.', '',
  ]
  await Bun.write(new URL(`${filename}.md`, output), lines.join('\n'))
  console.log(`Report: ${fileURLToPath(new URL(`${filename}.md`, output))}`)
}

if (import.meta.main) await main()
