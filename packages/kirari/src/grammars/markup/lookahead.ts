import type { Token } from '../../types.js'

export const looksLikeTag = (source: string, start: number, typed = false): boolean | undefined => {
  const input = source.slice(start)
  if (/^<\/?>/.test(input)) return true
  const head = /^<\/?[$_\p{ID_Start}][\p{ID_Continue}.$:-]*(?:(\s+extends\b)|(?=[\s/><]|$))/u.exec(input)
  if (!head) return false
  // An EOF word boundary can disappear when the next chunk extends the identifier.
  if (head[1]) return head[0] === input ? undefined : false
  return typed || input[head[0].length] !== '<'
}

export const canStartElement = (previous?: Token): boolean => {
  if (!previous) return true
  if (previous.type === 'property') return false
  if (previous.type === 'operator') return !['++', '--', '.', '?.'].includes(previous.value)
  return /^(?:return|yield|case|=>|\$\{|[([{,:;])$/.test(previous.value)
}
