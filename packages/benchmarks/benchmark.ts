import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { mkdir, mkdtemp, readdir, rm } from 'node:fs/promises'
import { cpus, platform, arch, release } from 'node:os'
import { join } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { gzipSync } from 'node:zlib'
import { corpus } from '../kirari/test/corpus/fixtures.js'
import { bundleEntry, highlight, languageNames } from './adapters.js'
import type { LanguageName } from './adapters.js'

export type Input = {
  id: string
  language: LanguageName
  source: string
}

export const inputs = (): Input[] => {
  const scaled = languageNames.flatMap(language => {
    const fixture = corpus.find(entry => entry.language === language)!
    const unit = fixture.source.endsWith('\n') ? fixture.source : `${fixture.source}\n`
    return [1024, 16 * 1024, 256 * 1024].map(target => ({
      id: `${language}/repeated-${target}`, language,
      source: unit.repeat(Math.ceil(target / Buffer.byteLength(unit))),
    }))
  })
  return [...corpus.map(({ id, language, source }) => ({ id, language, source })), ...scaled]
}

// This validates Kirari's text output; it is not a general HTML parser.
export const textFromHTML = (html: string): string => {
  const text = html.replace(/<span class="kirari-[a-z]+">|<\/span>/g, '')
  assert.ok(!text.includes('<'), 'Unexpected raw markup in highlighted output')
  assert.ok(!text.replace(/&(?:amp|lt|gt|quot|apos|#0?39|#x27);/g, '').includes('&'), 'Unescaped or unsupported entity in highlighted output')
  return text.replace(/&(?:amp|lt|gt|quot|apos|#0?39|#x27);/g, entity => ({
    '&amp;': '&', '&lt;': '<', '&gt;': '>', '&quot;': '"', '&apos;': "'", '&#39;': "'", '&#039;': "'", '&#x27;': "'",
  })[entity]!)
}

export const summarize = (values: readonly number[]) => {
  assert.ok(values.length > 0 && values.every(value => Number.isFinite(value) && value > 0))
  const sorted = [...values].sort((a, b) => a - b)
  const middle = Math.floor(sorted.length / 2)
  return {
    medianMs: sorted.length % 2 ? sorted[middle]! : (sorted[middle - 1]! + sorted[middle]!) / 2,
    minMs: sorted[0]!, maxMs: sorted.at(-1)!, samplesMs: [...values],
  }
}

let checksum = 0
const batch = (run: () => string, iterations: number): number => {
  const start = performance.now()
  for (let index = 0; index < iterations; index++) {
    const output = run()
    checksum = (checksum + output.length + output.charCodeAt(output.length >>> 1)) | 0
  }
  return performance.now() - start
}

const calibrate = (run: () => string, targetMs: number): number => {
  let count = 1
  let elapsed = batch(run, count)
  while (elapsed < targetMs && count < 4096) {
    count *= 2
    elapsed = batch(run, count)
  }
  return Math.max(1, Math.min(4096, Math.ceil(count * targetMs / Math.max(elapsed, 0.001))))
}

const measureBundles = async (directory: string) => {
  const bundles = []
  for (const [name, languages] of [
    ['javascript', ['javascript']], ['six languages', languageNames],
  ] as const) {
    const entry = join(directory, `kirari-${languages.length}.ts`)
    await Bun.write(entry, bundleEntry(languages))
    const result = await Bun.build({ entrypoints: [entry], target: 'browser', format: 'esm', minify: true })
    if (!result.success) throw new AggregateError(result.logs, 'Benchmark bundle failed')
    assert.equal(result.outputs.length, 1)
    const bytes = new Uint8Array(await result.outputs[0]!.arrayBuffer())
    const built = entry.replace(/\.ts$/, '.mjs')
    await Bun.write(built, bytes)
    const module = await import(pathToFileURL(built).href)
    for (const language of languages) {
      const source = corpus.find(entry => entry.language === language)!.source
      assert.equal(textFromHTML(module.highlight(source, language)), source)
    }
    bundles.push({ entry: name, minifiedBytes: bytes.length, gzipBytes: gzipSync(bytes, { level: 9 }).length })
  }
  return bundles
}

const fingerprint = async (directory: string): Promise<string> => {
  const hash = createHash('sha256')
  const files = (await readdir(directory, { recursive: true })).filter(path => path.endsWith('.js')).sort()
  for (const file of files) hash.update(file).update('\0').update(new Uint8Array(await Bun.file(join(directory, file)).arrayBuffer()))
  return hash.digest('hex')
}

export const measurementEnvironment = async () => {
  const kirariPackage = await Bun.file(new URL('../kirari/package.json', import.meta.url)).json()
  return {
    timestamp: new Date().toISOString(), runtime: `Bun ${Bun.version}`, os: `${platform()} ${release()}`,
    architecture: arch(), cpu: cpus()[0]?.model, logicalCores: cpus().length,
    versions: { kirari: kirariPackage.version },
    kirariBuildSHA256: await fingerprint(fileURLToPath(new URL('../kirari/dist', import.meta.url))),
    corpusSHA256: createHash('sha256').update(JSON.stringify(corpus)).digest('hex'),
  }
}

export const main = async () => {
  const quick = process.argv.includes('--quick')
  assert.ok(process.argv.slice(2).every(argument => argument === '--quick'), 'Only --quick is supported')
  const rounds = quick ? 3 : 7
  const targetMs = quick ? 2 : 20
  const root = fileURLToPath(new URL('.', import.meta.url))
  const temp = await mkdtemp(join(root, '.bench-'))
  try {
    const environment = await measurementEnvironment()
    const bundles = await measureBundles(temp)
    const timings = []
    for (const input of inputs()) {
      const run = () => highlight(input.source, input.language)
      const common = { id: input.id, language: input.language, inputBytes: Buffer.byteLength(input.source) }
      let html: string
      try {
        html = run()
        assert.equal(textFromHTML(html), input.source, 'source changed')
      } catch (error) {
        timings.push({ ...common, error: String(error) })
        continue
      }
      const iterations = calibrate(run, targetMs)
      const samples: number[] = []
      for (let round = 0; round < rounds; round++) samples.push(batch(run, iterations) / iterations)
      const stats = summarize(samples)
      timings.push({ ...common, ...stats, iterationsPerSample: iterations, outputBytes: Buffer.byteLength(html),
        mibPerSecond: common.inputBytes / (1024 * 1024) / (stats.medianMs / 1000) })
      console.log(`Measured ${input.id} (${Buffer.byteLength(input.source)} bytes)`)
    }
    const report = { environment, mode: quick ? 'quick smoke run' : 'measurement', rounds, targetBatchMs: targetMs,
      checksum, bundles, timings }
    const results = join(root, 'results')
    await mkdir(results, { recursive: true })
    await Bun.write(join(results, 'latest.json'), JSON.stringify(report, null, 2) + '\n')
    const lines = [
      '# Local highlighting benchmark', '',
      `${environment.timestamp} · ${environment.runtime} · ${environment.os} ${environment.architecture} · ${environment.cpu}`, '',
      `Kirari ${environment.versions.kirari}. Mode: **${report.mode}**.`, '',
      'Warm in-process tokenize + render; median of batch means (not individual-call latency percentiles).',
      `${rounds} measured batches per input, calibrated toward ${targetMs} ms each; no explicit GC. Raw samples and build/corpus SHA-256 hashes are in latest.json.`, '',
      'Uses the public core with explicit language imports.',
      'All timed results passed escaped HTML text reconstruction. Repeated inputs are synthetic scale probes, not a representative application workload.', '',
      '## Browser bundles', '',
      'Bun minified ESM, gzip level 9, CSS excluded; exports highlight(source, language).', '',
      '| Languages | Minified bytes | Gzip bytes |', '| --- | ---: | ---: |',
      ...bundles.map(row => `| ${row.entry} | ${row.minifiedBytes} | ${row.gzipBytes} |`), '',
      '## Timings', '',
      '| Input | Bytes | Median ms/op | Min–max ms/op | MiB/s | HTML bytes |',
      '| --- | ---: | ---: | ---: | ---: | ---: |',
      ...timings.map(row => 'medianMs' in row
        ? `| ${row.id} | ${row.inputBytes} | ${row.medianMs.toFixed(4)} | ${row.minMs.toFixed(4)}–${row.maxMs.toFixed(4)} | ${row.mibPerSecond.toFixed(2)} | ${row.outputBytes} |`
        : `| ${row.id} | ${row.inputBytes} | FAILED validation | — | — | — |`), '',
      'No browser/Node timing, startup cost, or memory profiling is included. A quick run only checks the harness.', '',
    ]
    await Bun.write(join(results, 'latest.md'), lines.join('\n'))
    console.log(`Report: ${join(results, 'latest.md')}`)
    if (timings.some(row => 'error' in row)) throw new Error('Some inputs failed validation; see latest.json. No timings were recorded for those inputs.')
  } finally {
    await rm(temp, { recursive: true, force: true })
  }
}

if (import.meta.main) await main()
