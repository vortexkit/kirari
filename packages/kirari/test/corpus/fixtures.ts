export type CorpusLanguage = 'javascript' | 'typescript' | 'tsx' | 'python' | 'json' | 'shell'

export type CorpusAssertion = {
  text: string
  type: string
  occurrence?: number
}

export interface CorpusGap extends CorpusAssertion {
  reason: string
}

export type CorpusFixture = {
  id: string
  language: CorpusLanguage
  source: string
  assertions: CorpusAssertion[]
  gaps?: CorpusGap[]
}

// Original examples and manually annotated spans; these are not parser conformance tests.
export const corpus: readonly CorpusFixture[] = [
  {
    id: 'javascript-request-handler', language: 'javascript',
    source: 'export async function loadBadge(client) {\n  const reply = await client?.fetch("/badge");\n  return { ready: true, payload: null, size: 24 };\n}',
    assertions: [
      { text: 'export', type: 'keyword' }, { text: 'async', type: 'keyword' },
      { text: 'loadBadge', type: 'function' }, { text: 'await', type: 'keyword' },
      { text: '?.', type: 'operator' }, { text: 'fetch', type: 'property' },
      { text: '"/badge"', type: 'string' }, { text: 'ready', type: 'property' },
      { text: 'payload', type: 'property' }, { text: 'true', type: 'boolean' },
      { text: 'null', type: 'null' }, { text: '24', type: 'number' },
      { text: '\n  ', type: 'text', occurrence: 0 },
    ],
  },
  {
    id: 'javascript-slashes-and-numbers', language: 'javascript',
    source: 'const marker = /crate\\/[A-Z]+/giu;\nconst ratio = total / 0x20; // divide after a name\nconst mask = 0b1010_0101n + .75e2;',
    assertions: [
      { text: '/crate\\/[A-Z]+/giu', type: 'regex' }, { text: 'ratio', type: 'variable' },
      { text: '/', type: 'operator', occurrence: 3 }, { text: '0x20', type: 'number' },
      { text: '// divide after a name', type: 'comment' },
      { text: '0b1010_0101n', type: 'number' }, { text: '.75e2', type: 'number' },
      { text: '+', type: 'operator', occurrence: 1 },
    ],
  },
  {
    id: 'javascript-nested-unicode-template', language: 'javascript',
    source: 'const résumé = `🚲 ${format({ label: `区${station.code}` })} \\${literal}`;\n// <img src=x onerror="bad()"> & goodbye',
    assertions: [
      { text: 'résumé', type: 'variable' }, { text: '`🚲 ', type: 'string' },
      { text: '${', type: 'punctuation', occurrence: 0 }, { text: 'format', type: 'function' },
      { text: 'label', type: 'property' }, { text: '`区', type: 'string' },
      { text: 'station', type: 'variable' }, { text: 'code', type: 'property' },
      { text: ' \\${literal}`', type: 'string' },
      { text: '// <img src=x onerror="bad()"> & goodbye', type: 'comment' },
    ],
  },
  {
    id: 'javascript-unfinished-template', language: 'javascript',
    source: 'let draft = `status: ${merge({ open: false, note: "cut off\\',
    assertions: [
      { text: 'let', type: 'keyword' }, { text: 'draft', type: 'variable' },
      { text: '`status: ', type: 'string' }, { text: '${', type: 'punctuation' },
      { text: 'merge', type: 'function' }, { text: 'open', type: 'property' },
      { text: 'false', type: 'boolean' }, { text: '"cut off\\', type: 'string' },
    ],
  },
  {
    id: 'javascript-contextual-gaps', language: 'javascript',
    source: 'if (active) /door+/u.test(label);\nconst \\u0063rate = 3;',
    assertions: [
      { text: 'if', type: 'keyword' }, { text: 'active', type: 'variable' },
      { text: 'test', type: 'property' }, { text: 'const', type: 'keyword' },
      { text: '3', type: 'number', occurrence: 1 },
      { text: '/door+/u', type: 'regex' },
      { text: '\\u0063rate', type: 'variable' },
    ],
  },
  {
    id: 'typescript-interface', language: 'typescript',
    source: 'export interface Shipment {\n  readonly tracking: string;\n  count: number;\n  fragile: boolean;\n}\nconst valid = false satisfies boolean;',
    assertions: [
      { text: 'export', type: 'keyword' }, { text: 'interface', type: 'keyword' },
      { text: 'readonly', type: 'keyword' }, { text: 'string', type: 'type' },
      { text: 'number', type: 'type' }, { text: 'boolean', type: 'type', occurrence: 0 },
      { text: 'false', type: 'boolean' }, { text: 'satisfies', type: 'keyword' },
      { text: 'boolean', type: 'type', occurrence: 1 },
    ],
  },
  {
    id: 'typescript-semicolon-members', language: 'typescript',
    source: 'class Box { v: T; w: string }\ninterface I { first: T; /* member */ second: Box; third: number }',
    assertions: [
      { text: 'v', type: 'property' }, { text: 'w', type: 'property' },
      { text: 'first', type: 'property' }, { text: 'second', type: 'property' },
      { text: 'third', type: 'property' }, { text: '/* member */', type: 'comment' },
      { text: 'string', type: 'type' }, { text: 'number', type: 'type' },
    ],
  },
  {
    id: 'tsx-semicolon-members', language: 'tsx',
    source: 'interface Props { title: string; count: number }\nconst view = <Box />;',
    assertions: [
      { text: 'title', type: 'property' }, { text: 'count', type: 'property' },
      { text: 'string', type: 'type' }, { text: 'number', type: 'type' },
      { text: 'view', type: 'variable' }, { text: 'Box', type: 'tag' },
    ],
  },
  {
    id: 'typescript-class-and-operators', language: 'typescript',
    source: 'class Meter {\n  private reading: number = 1_024;\n  sample(): unknown { return this.reading ?? undefined; }\n}',
    assertions: [
      { text: 'class', type: 'keyword' }, { text: 'Meter', type: 'type' },
      { text: 'private', type: 'keyword' }, { text: 'number', type: 'type' },
      { text: '1_024', type: 'number' }, { text: 'sample', type: 'function' },
      { text: 'unknown', type: 'type' }, { text: 'this', type: 'keyword' },
      { text: 'reading', type: 'property', occurrence: 1 },
      { text: '??', type: 'operator' }, { text: 'undefined', type: 'null' },
    ],
  },
  {
    id: 'typescript-unicode-and-template', language: 'typescript',
    source: 'const 路線: string = "北 & <南> 🚉";\nconst café: number = 0o17;\nconst caption = `line ${route.name}` as const;',
    assertions: [
      { text: '路線', type: 'variable' }, { text: 'string', type: 'type' },
      { text: '"北 & <南> 🚉"', type: 'string' }, { text: 'café', type: 'variable' },
      { text: 'number', type: 'type' }, { text: '0o17', type: 'number' },
      { text: '`line ', type: 'string' }, { text: 'route', type: 'variable' },
      { text: 'name', type: 'property' }, { text: 'as', type: 'keyword' },
    ],
  },
  {
    id: 'typescript-unfinished-comment', language: 'typescript',
    source: 'declare function consume(input: unknown): void;\n/* pending signature: <T & U> "🚧',
    assertions: [
      { text: 'declare', type: 'keyword' }, { text: 'function', type: 'keyword' },
      { text: 'consume', type: 'function' }, { text: 'input', type: 'variable' },
      { text: 'unknown', type: 'type' },
      { text: '/* pending signature: <T & U> "🚧', type: 'comment' },
      { text: 'void', type: 'type' },
    ],
  },
  {
    id: 'typescript-type-context-gaps', language: 'typescript',
    source: 'type Parcel = { destination: string };\nconst manifest: Parcel = { destination: "Harbor" };',
    assertions: [
      { text: 'type', type: 'keyword' }, { text: 'destination', type: 'property', occurrence: 0 },
      { text: 'string', type: 'type' }, { text: 'const', type: 'keyword' },
      { text: 'manifest', type: 'variable' }, { text: '"Harbor"', type: 'string' },
      { text: 'Parcel', type: 'type', occurrence: 0 },
      { text: 'Parcel', type: 'type', occurrence: 1 },
    ],
  },
  {
    id: 'typescript-enum-declaration-names', language: 'typescript',
    source: 'enum Color { Red, Blue }\ndeclare enum D { Up }\ninterface I {}\nabstract class A {}\ntype K = string;',
    assertions: [
      { text: 'enum', type: 'keyword', occurrence: 0 }, { text: 'Color', type: 'type' },
      { text: 'enum', type: 'keyword', occurrence: 1 }, { text: 'D', type: 'type' },
      { text: 'interface', type: 'keyword' }, { text: 'I', type: 'type' },
      { text: 'class', type: 'keyword' }, { text: 'A', type: 'type' },
      { text: 'type', type: 'keyword' }, { text: 'K', type: 'type' },
    ],
  },
  {
    id: 'tsx-component-props', language: 'tsx',
    source: 'const panel: unknown = <Notice tone="quiet" hidden={false} onOpen={() => reveal(record.id)}>Ready &amp; waiting</Notice>;',
    assertions: [
      { text: 'const', type: 'keyword' }, { text: 'unknown', type: 'type' },
      { text: 'Notice', type: 'tag', occurrence: 0 }, { text: 'Notice', type: 'tag', occurrence: 1 },
      { text: 'tone', type: 'attribute' }, { text: '"quiet"', type: 'string' },
      { text: 'hidden', type: 'attribute' }, { text: 'false', type: 'boolean' },
      { text: 'onOpen', type: 'attribute' }, { text: '=>', type: 'operator' },
      { text: 'reveal', type: 'function' }, { text: 'id', type: 'property', occurrence: 1 },
      { text: 'Ready ', type: 'text' }, { text: '&amp;', type: 'entity' },
    ],
  },
  {
    id: 'tsx-arrow-component-binding', language: 'tsx',
    source: 'export const DismissibleUsage = () => {\n  const visible = true;\n  return visible ? <Dismissible onClose={() => setVisible(false)}>Ready</Dismissible> : null;\n};',
    assertions: [
      { text: 'DismissibleUsage', type: 'function' },
      { text: 'visible', type: 'variable', occurrence: 0 }, { text: 'visible', type: 'variable', occurrence: 1 },
      { text: 'Dismissible', type: 'tag', occurrence: 1 }, { text: 'Dismissible', type: 'tag', occurrence: 2 },
      { text: 'onClose', type: 'attribute' }, { text: 'setVisible', type: 'function' },
    ],
  },
  {
    id: 'javascript-function-bindings', language: 'javascript',
    source: 'const build = function named(value = make()) { return value };\nconst run = async (item = `x${load()}`) => item;\nconst actions = { save: () => true, get() { return 1 } };',
    assertions: [
      { text: 'build', type: 'function' }, { text: 'named', type: 'function' },
      { text: 'make', type: 'function' }, { text: 'run', type: 'function' },
      { text: 'async', type: 'keyword' }, { text: 'load', type: 'function' },
      { text: 'save', type: 'function' }, { text: 'get', type: 'function' },
    ],
  },
  {
    id: 'tsx-generic-function-signatures', language: 'tsx',
    source: 'export const select: Handler = <T,>(\n  value: T,\n): T => value;\nclass Worker { async *items<T>(value: T) { yield value } }',
    assertions: [
      { text: 'select', type: 'function' }, { text: 'Handler', type: 'type' },
      { text: 'items', type: 'function' }, { text: 'Worker', type: 'type' },
      { text: 'async', type: 'keyword' }, { text: 'yield', type: 'keyword' },
    ],
  },
  {
    id: 'tsx-fragments-and-nested-expressions', language: 'tsx',
    source: 'const rows = <>{entries.map(entry => <Row key={entry.key}>{entry.done ? <b>✓</b> : `次 ${entry.title}`}</Row>)}<hr /></>;',
    assertions: [
      { text: '<>', type: 'punctuation' }, { text: '</>', type: 'punctuation' },
      { text: 'map', type: 'property' }, { text: 'Row', type: 'tag', occurrence: 0 },
      { text: 'key', type: 'attribute', occurrence: 0 }, { text: 'key', type: 'property', occurrence: 1 },
      { text: 'done', type: 'property' }, { text: '✓', type: 'text' },
      { text: '`次 ', type: 'string' }, { text: 'title', type: 'property' },
      { text: 'hr', type: 'tag' },
    ],
  },
  {
    id: 'tsx-sibling-snippets', language: 'tsx',
    source: '<Container width="100%" padding={4}><Placeholder /></Container>\n\n<Container width="100%"><Placeholder /></Container>\n<Last />',
    assertions: [
      { text: 'Container', type: 'tag', occurrence: 0 }, { text: 'Container', type: 'tag', occurrence: 1 },
      { text: 'Container', type: 'tag', occurrence: 2 }, { text: 'Container', type: 'tag', occurrence: 3 },
      { text: 'width', type: 'attribute', occurrence: 0 }, { text: 'width', type: 'attribute', occurrence: 1 },
      { text: 'Placeholder', type: 'tag', occurrence: 0 }, { text: 'Placeholder', type: 'tag', occurrence: 1 },
      { text: 'Last', type: 'tag' },
    ],
  },
  {
    id: 'tsx-markup-looking-literals', language: 'tsx',
    source: 'const text = "<Fake />"; /* <Ghost /> */\nconst view = <p title="<&">🚀 中文 &lt; {2 < limit && /ok/.test(value)}</p>;',
    assertions: [
      { text: '"<Fake />"', type: 'string' }, { text: '/* <Ghost /> */', type: 'comment' },
      { text: 'p', type: 'tag', occurrence: 0 }, { text: 'title', type: 'attribute' },
      { text: '🚀 中文 ', type: 'text' }, { text: '&lt;', type: 'entity' },
      { text: '2', type: 'number' }, { text: '&&', type: 'operator' },
      { text: '/ok/', type: 'regex' }, { text: 'test', type: 'property' },
    ],
  },
  {
    id: 'tsx-unfinished-expression', language: 'tsx',
    source: 'const partial = <Banner aria-label="Loading 🚦">{busy ? <Spinner /> : `done ${job.',
    assertions: [
      { text: 'const', type: 'keyword' }, { text: 'partial', type: 'variable' },
      { text: 'Banner', type: 'tag' }, { text: 'aria-label', type: 'attribute' },
      { text: '"Loading 🚦"', type: 'string' }, { text: 'busy', type: 'variable' },
      { text: 'Spinner', type: 'tag' }, { text: '`done ', type: 'string' },
      { text: 'job', type: 'variable' },
    ],
  },
  {
    id: 'tsx-tag-type-argument-gap', language: 'tsx',
    source: 'const typed = <Grid<string> rows={items} />;',
    assertions: [
      { text: 'const', type: 'keyword' }, { text: 'typed', type: 'variable' },
      { text: 'string', type: 'type' },
      { text: 'Grid', type: 'tag' },
      { text: 'rows', type: 'attribute' },
    ],
  },
  {
    id: 'python-function-and-values', language: 'python',
    source: 'def select_route(routes):\n    for route in routes:\n        if route.enabled:\n            return True\n    return None # no match\n',
    assertions: [
      { text: 'def', type: 'keyword' }, { text: 'select_route', type: 'function' },
      { text: 'for', type: 'keyword' }, { text: 'in', type: 'keyword', occurrence: 0 },
      { text: 'if', type: 'keyword' }, { text: 'enabled', type: 'property' },
      { text: 'True', type: 'boolean' }, { text: 'None', type: 'null' },
      { text: '# no match', type: 'comment' },
    ],
  },
  {
    id: 'python-literal-forms', language: 'python',
    source: 'class Gauge:\n    """Measure <air> & water.\n    Keep units explicit."""\n    scale = 0x2A + 1_500.25e-2\n    wave = 4j\n    path = r"C:\\temp\\meter"\n',
    assertions: [
      { text: 'class', type: 'keyword' }, { text: 'Gauge', type: 'type' },
      { text: '"""Measure <air> & water.\n    Keep units explicit."""', type: 'string' },
      { text: 'scale', type: 'variable' }, { text: '0x2A', type: 'number' },
      { text: '1_500.25e-2', type: 'number' }, { text: '4j', type: 'number' },
      { text: 'r"C:\\temp\\meter"', type: 'string' },
    ],
  },
  {
    id: 'python-unicode-comprehension', language: 'python',
    source: '# Δρομολόγιο 🚲\r\nπόλη = "港 & <dock>"\r\nlabels = [str(item.code) for item in queue if item.ready != False]\r\n',
    assertions: [
      { text: '# Δρομολόγιο 🚲', type: 'comment' }, { text: 'πόλη', type: 'variable' },
      { text: '"港 & <dock>"', type: 'string' }, { text: 'str', type: 'function' },
      { text: 'code', type: 'property' }, { text: 'for', type: 'keyword' },
      { text: 'ready', type: 'property' }, { text: '!=', type: 'operator' },
      { text: 'False', type: 'boolean' }, { text: '\r\n', type: 'text', occurrence: 1 },
    ],
  },
  {
    id: 'python-unfinished-triple-string', language: 'python',
    source: 'async def log_report():\n    await emit("start")\n    detail = """unfinished 🚧\n<node attr=\'x\'> & \\',
    assertions: [
      { text: 'async', type: 'keyword' }, { text: 'def', type: 'keyword' },
      { text: 'log_report', type: 'function' }, { text: 'await', type: 'keyword' },
      { text: 'emit', type: 'function' }, { text: '"start"', type: 'string' },
      { text: '"""unfinished 🚧\n<node attr=\'x\'> & \\', type: 'string' },
    ],
  },
  {
    id: 'python-f-string-gap', language: 'python',
    source: 'label = f"Arrival {station.name}: {count + 1} 🚉"\nprint(label)',
    assertions: [
      { text: 'label', type: 'variable', occurrence: 0 }, { text: 'f"Arrival ', type: 'string' },
      { text: ' 🚉"', type: 'string' }, { text: 'print', type: 'function' },
      { text: 'station', type: 'variable' },
      { text: 'name', type: 'property' },
      { text: '+', type: 'operator' },
    ],
  },
  {
    id: 'json-nested-record', language: 'json',
    source: '{"station": {"name": "Riverside", "open": true}, "arrivals": [3, 8], "delay": null, "closed": false}',
    assertions: [
      { text: '"station"', type: 'property' }, { text: '"name"', type: 'property' },
      { text: '"Riverside"', type: 'string' }, { text: '"open"', type: 'property' },
      { text: 'true', type: 'boolean' }, { text: '"arrivals"', type: 'property' },
      { text: '[', type: 'punctuation' }, { text: '3', type: 'number' },
      { text: '8', type: 'number' }, { text: 'null', type: 'null' },
      { text: 'false', type: 'boolean' },
    ],
  },
  {
    id: 'json-escapes-and-exponents', language: 'json',
    source: '{"quote\\\"key": "line\\nnext\\t\\u263A", "ratio": -0.125E+3, "tiny": 6e-8, "slash": "a\\/b\\\\c"}',
    assertions: [
      { text: '"quote\\\"key"', type: 'property' }, { text: '"line\\nnext\\t\\u263A"', type: 'string' },
      { text: '-0.125E+3', type: 'number' }, { text: '6e-8', type: 'number' },
      { text: '"slash"', type: 'property' }, { text: '"a\\/b\\\\c"', type: 'string' },
    ],
  },
  {
    id: 'json-unicode-and-html', language: 'json',
    source: '{\r\n\t"地名": "Zürich 🚋",\r\n\t"markup": "</span><img src=x onerror=\'boom\'> &amp;",\r\n\t"pair": "é𐐀"\r\n}',
    assertions: [
      { text: '\r\n\t', type: 'text', occurrence: 0 }, { text: '"地名"', type: 'property' },
      { text: '"Zürich 🚋"', type: 'string' }, { text: '"markup"', type: 'property' },
      { text: '"</span><img src=x onerror=\'boom\'> &amp;"', type: 'string' },
      { text: '"é𐐀"', type: 'string' },
    ],
  },
  {
    id: 'json-unfinished-string', language: 'json',
    source: '{"rows": [1, 2], "note": "pending 🚧\\',
    assertions: [
      { text: '"rows"', type: 'property' }, { text: '[', type: 'punctuation' },
      { text: '1', type: 'number' }, { text: '2', type: 'number' },
      { text: '"note"', type: 'property' }, { text: '"pending 🚧\\', type: 'string' },
    ],
  },
  {
    id: 'json-key-lookahead', language: 'json',
    source: '[{"same" \n : "same"}, "https://dock.invalid/#gate", {"empty": "", "zero": -0}]',
    assertions: [
      { text: '"same"', type: 'property', occurrence: 0 },
      { text: '"same"', type: 'string', occurrence: 1 },
      { text: '"https://dock.invalid/#gate"', type: 'string' },
      { text: '"empty"', type: 'property' }, { text: '""', type: 'string' },
      { text: '"zero"', type: 'property' }, { text: '-0', type: 'number' },
    ],
  },
  {
    id: 'shell-loop-and-parameters', language: 'shell',
    source: '#!/bin/sh\nfor route in north south; do\n  DEST=harbor\n  printf \'%s\\n\' $route ${DEST} "$HOME"\ndone # finished\n',
    assertions: [
      { text: '#!/bin/sh', type: 'comment' }, { text: 'for', type: 'keyword' },
      { text: 'in', type: 'keyword', occurrence: 1 }, { text: 'do', type: 'keyword', occurrence: 0 },
      { text: 'DEST', type: 'variable', occurrence: 0 }, { text: "'%s\\n'", type: 'string' },
      { text: '$route', type: 'variable' }, { text: '${DEST}', type: 'variable' },
      { text: '"', type: 'string', occurrence: 0 }, { text: 'done', type: 'keyword' },
      { text: '# finished', type: 'comment' },
      { text: '$HOME', type: 'variable' },
    ],
  },
  {
    id: 'shell-pipelines-and-hash', language: 'shell',
    source: 'if check; then\n  emit https://dock.invalid/#gate 2>>errors | filter && finish\nfi\nprintf \'# literal\' # actual comment\n',
    assertions: [
      { text: 'if', type: 'keyword', occurrence: 0 }, { text: 'then', type: 'keyword' },
      { text: '2', type: 'number' }, { text: '>>', type: 'operator' },
      { text: '|', type: 'operator' }, { text: '&&', type: 'operator' },
      { text: 'fi', type: 'keyword', occurrence: 2 }, { text: "'# literal'", type: 'string' },
      { text: '# actual comment', type: 'comment' },
    ],
  },
  {
    id: 'shell-unicode-and-special-parameters', language: 'shell',
    source: 'MESSAGE=\'Port 🚢 <east> & west\'\r\nprintf "%s" "$MESSAGE"\r\nexit $status; echo $? $1 $$ $@ # 帰港\r\n',
    assertions: [
      { text: 'MESSAGE', type: 'variable', occurrence: 0 },
      { text: "'Port 🚢 <east> & west'", type: 'string' }, { text: '"%s"', type: 'string' },
      { text: '$status', type: 'variable' }, { text: '$?', type: 'variable' },
      { text: '$1', type: 'variable' }, { text: '$$', type: 'variable' },
      { text: '$@', type: 'variable' }, { text: '# 帰港', type: 'comment' },
      { text: '\r\n', type: 'text', occurrence: 0 },
      { text: '$MESSAGE', type: 'variable' },
    ],
  },
  {
    id: 'shell-unfinished-quote', language: 'shell',
    source: 'NAME=quay\necho ${NAME} "unfinished 🚧 <dock> & \\',
    assertions: [
      { text: 'NAME', type: 'variable', occurrence: 0 }, { text: '=', type: 'operator' },
      { text: '${NAME}', type: 'variable' }, { text: '"unfinished 🚧 <dock> & \\', type: 'string' },
    ],
  },
  {
    id: 'shell-heredoc-and-nested-expansion-gaps', language: 'shell',
    source: 'cat <<\'NOTE\'\n<dock> & "$UNCHANGED"\nNOTE\necho ${PORT:-${FALLBACK}}\n',
    assertions: [
      { text: '<<', type: 'operator' }, { text: "'NOTE'", type: 'string' },
      { text: '<dock> & "$UNCHANGED"', type: 'string' },
      { text: '${PORT:-${FALLBACK}}', type: 'variable' },
    ],
  },
  {
    id: 'javascript-decorators', language: 'javascript',
    source: '@sealed\n@factory()\nclass Parcel {}',
    assertions: [
      { text: '@', type: 'operator', occurrence: 0 }, { text: '@', type: 'operator', occurrence: 1 },
      { text: 'sealed', type: 'function' }, { text: 'factory', type: 'function' },
      { text: 'class', type: 'keyword' }, { text: 'Parcel', type: 'type' },
    ],
  },
  {
    id: 'typescript-qualified-decorator', language: 'typescript',
    source: '@registry /* namespace */ .sealed\nclass Parcel {}',
    assertions: [
      { text: '@', type: 'operator' }, { text: 'registry', type: 'variable' },
      { text: '/* namespace */', type: 'comment' }, { text: 'sealed', type: 'property' },
      { text: 'Parcel', type: 'type' },
    ],
  },
  {
    id: 'python-decorators-and-matrix-multiplication', language: 'python',
    source: '@dataclass\n@registry.sealed()\nclass Parcel:\n    result = left @ right',
    assertions: [
      { text: '@', type: 'operator', occurrence: 0 }, { text: '@', type: 'operator', occurrence: 1 },
      { text: '@', type: 'operator', occurrence: 2 }, { text: 'dataclass', type: 'function' },
      { text: 'registry', type: 'variable' }, { text: 'sealed', type: 'property' },
      { text: 'Parcel', type: 'type' }, { text: 'left', type: 'variable' }, { text: 'right', type: 'variable' },
    ],
  },
]
