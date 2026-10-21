export const lineRanges = (meta: unknown): [number, number][] => {
  if (typeof meta !== 'string') return []
  const ranges: [number, number][] = []
  let quote = ''
  let start = -1
  let depth = 0
  for (let index = 0; index < meta.length; index++) {
    const char = meta[index]!
    if (char === '\\') {
      index++
      start = -1
    } else if (quote) {
      if (char === quote) quote = ''
    } else if (char === '"' || char === "'") {
      quote = char
      start = -1
    } else if (char === '{') {
      depth++
      start = depth === 1 && (index === 0 || /\s/.test(meta[index - 1]!)) ? index + 1 : -1
    } else if (char === '}') {
      depth = Math.max(0, depth - 1)
      if (depth !== 0 || start < 0) continue
      const body = meta.slice(start, index)
      if ((index + 1 === meta.length || /\s/.test(meta[index + 1]!))
        && /^\s*[1-9]\d*(?:\s*-\s*[1-9]\d*)?(?:\s*,\s*[1-9]\d*(?:\s*-\s*[1-9]\d*)?)*\s*$/.test(body)) {
        const parsed = body.split(',').map(part => {
          const [first, last = first] = part.split('-').map(Number)
          return [first!, last!] as [number, number]
        })
        if (parsed.every(([first, last]) => Number.isSafeInteger(first) && Number.isSafeInteger(last) && first <= last)) {
          for (const range of parsed) ranges.push(range)
        }
      }
      start = -1
    } else if (start >= 0 && !/[\d\s,-]/.test(char)) {
      start = -1
    }
  }
  return ranges.sort((left, right) => left[0] - right[0])
}
