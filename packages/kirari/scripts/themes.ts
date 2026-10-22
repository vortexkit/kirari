// Generates themes/*.css from the palettes below. Run `bun run themes` after editing.
// Each file starts with a `/* Label (appearance) — credit */` header that the docs site reads.
import { tokenTypes, type TokenType } from '../src/types.js'

type Colors = Partial<Record<TokenType, string>> & { background: string; text: string; keyword: string; function: string; string: string; number: string; comment: string }

type Theme = {
  id: string
  label: string
  appearance: 'light' | 'dark'
  credit: string
  colors: Colors
}

/** Categories most themes color alike; a theme only lists the ones that differ. */
const inherit: Partial<Record<TokenType, (colors: Colors) => string>> = {
  variable: c => c.text,
  property: c => c.text,
  boolean: c => c.number,
  null: c => c.boolean ?? c.number,
  operator: c => c.keyword,
  punctuation: c => c.text,
  type: c => c.function,
  regex: c => c.string,
  inserted: c => c.string,
  deleted: c => c.keyword,
  heading: c => c.function,
  tag: c => c.keyword,
  attribute: c => c.property ?? c.function,
  entity: c => c.number,
}

const kirari = 'an original Kirari palette'

export const themes: Theme[] = [
  { id: 'default', label: 'Kirari', appearance: 'dark', credit: kirari, colors: { background: '#151820', text: '#dce1ea', keyword: '#c4a7ff', property: '#82d4d0', function: '#9dbdff', string: '#a9d994', number: '#f3c78a', comment: '#949cab', operator: '#e9a6b1', punctuation: '#adb6c6', type: '#8fd4ed', regex: '#edb98a', deleted: '#f2a0a9', tag: '#e9a6b1', attribute: '#82d4d0' } },
  { id: 'daylight', label: 'Daylight', appearance: 'light', credit: kirari, colors: { background: '#ffffff', text: '#2b3040', keyword: '#7a3fd1', property: '#1f6f86', function: '#2f55d4', string: '#19795a', number: '#b4581a', boolean: '#b0407a', comment: '#868b98', operator: '#646a7b', punctuation: '#868b98', type: '#92600f', regex: '#b4581a', deleted: '#c23b4e', tag: '#b0407a', entity: '#92600f' } },
  { id: 'dusk', label: 'Dusk', appearance: 'dark', credit: kirari, colors: { background: '#14151c', text: '#d5d8e3', keyword: '#c4a7ff', property: '#82d4d0', function: '#9dbdff', string: '#a9d994', number: '#f3c78a', boolean: '#f0a6c8', comment: '#7d8394', operator: '#b6bccb', punctuation: '#8b91a2', type: '#8fd4ed', regex: '#edb98a', deleted: '#f2a0a9', tag: '#e9a6b1' } },
  { id: 'paper', label: 'Paper', appearance: 'light', credit: kirari, colors: { background: '#f6f2ea', text: '#4a463f', keyword: '#8b4e65', property: '#4c6c7b', function: '#586c97', string: '#4c7153', number: '#916236', boolean: '#8b4e65', comment: '#8d877b', operator: '#7a6173', punctuation: '#8d877b', type: '#806442', regex: '#916236', deleted: '#a64949', heading: '#8b4e65', tag: '#8b4e65' } },
  { id: 'ad-astra-light', label: 'Ad Astra Light', appearance: 'light', credit: 'the Vortex docs syntax colors', colors: { background: '#f6f6f6', text: '#333333', keyword: '#646464', property: '#646464', function: '#ab00fa', string: '#007869', number: '#ab00fa', comment: '#999999', operator: '#646464', punctuation: '#646464', type: '#ab00fa', deleted: '#c2334d', tag: '#ab00fa', attribute: '#646464' } },
  { id: 'ad-astra-dark', label: 'Ad Astra Dark', appearance: 'dark', credit: 'the Vortex docs syntax colors', colors: { background: '#111111', text: '#ffffff', keyword: '#a0a0a0', property: '#a0a0a0', function: '#fbadff', string: '#57e2e5', number: '#fbadff', comment: '#a0a0a0', operator: '#a0a0a0', punctuation: '#a0a0a0', type: '#fbadff', deleted: '#ff9aa8', tag: '#fbadff', attribute: '#a0a0a0' } },
  { id: 'github-light', label: 'GitHub Light', appearance: 'light', credit: 'based on GitHub’s Primer VS Code theme (MIT)', colors: { background: '#ffffff', text: '#1f2328', keyword: '#cf222e', property: '#0550ae', function: '#8250df', string: '#0a3069', number: '#0550ae', comment: '#6e7781', type: '#953800', regex: '#116329', inserted: '#116329', deleted: '#82071e', heading: '#0550ae', tag: '#116329', entity: '#953800' } },
  { id: 'github-dark', label: 'GitHub Dark', appearance: 'dark', credit: 'based on GitHub’s Primer VS Code theme (MIT)', colors: { background: '#0d1117', text: '#e6edf3', keyword: '#ff7b72', property: '#79c0ff', function: '#d2a8ff', string: '#a5d6ff', number: '#79c0ff', comment: '#8b949e', type: '#ffa657', regex: '#7ee787', inserted: '#7ee787', deleted: '#ffa198', heading: '#79c0ff', tag: '#7ee787', entity: '#ffa657' } },
  { id: 'one-dark', label: 'One Dark', appearance: 'dark', credit: 'based on Atom’s One Dark (MIT)', colors: { background: '#282c34', text: '#abb2bf', keyword: '#c678dd', property: '#e06c75', function: '#61afef', string: '#98c379', number: '#d19a66', comment: '#7f848e', operator: '#56b6c2', type: '#e5c07b', regex: '#56b6c2', deleted: '#e06c75', heading: '#e06c75', tag: '#e06c75', attribute: '#d19a66' } },
  { id: 'dracula', label: 'Dracula', appearance: 'dark', credit: 'based on Dracula by Zeno Rocha (MIT)', colors: { background: '#282a36', text: '#f8f8f2', keyword: '#ff79c6', property: '#8be9fd', function: '#50fa7b', string: '#f1fa8c', number: '#bd93f9', comment: '#6272a4', type: '#8be9fd', regex: '#ff5555', inserted: '#50fa7b', deleted: '#ff5555', heading: '#bd93f9', attribute: '#50fa7b' } },
  { id: 'nord', label: 'Nord', appearance: 'dark', credit: 'based on Nord by Arctic Ice Studio (MIT)', colors: { background: '#2e3440', text: '#d8dee9', keyword: '#81a1c1', property: '#8fbcbb', function: '#88c0d0', string: '#a3be8c', number: '#b48ead', comment: '#616e88', punctuation: '#eceff4', type: '#8fbcbb', regex: '#ebcb8b', deleted: '#bf616a', entity: '#ebcb8b' } },
  { id: 'monokai', label: 'Monokai', appearance: 'dark', credit: 'based on Monokai by Wimer Hazenberg', colors: { background: '#272822', text: '#f8f8f2', keyword: '#f92672', property: '#66d9ef', function: '#a6e22e', string: '#e6db74', number: '#ae81ff', comment: '#88846f', type: '#66d9ef', inserted: '#a6e22e', heading: '#a6e22e', attribute: '#a6e22e' } },
  { id: 'solarized-light', label: 'Solarized Light', appearance: 'light', credit: 'based on Solarized by Ethan Schoonover (MIT)', colors: { background: '#fdf6e3', text: '#657b83', keyword: '#859900', property: '#268bd2', function: '#268bd2', string: '#2aa198', number: '#d33682', boolean: '#b58900', comment: '#93a1a1', type: '#b58900', regex: '#dc322f', inserted: '#859900', deleted: '#dc322f', heading: '#cb4b16', tag: '#268bd2', attribute: '#b58900', entity: '#cb4b16' } },
  { id: 'solarized-dark', label: 'Solarized Dark', appearance: 'dark', credit: 'based on Solarized by Ethan Schoonover (MIT)', colors: { background: '#002b36', text: '#839496', keyword: '#859900', property: '#268bd2', function: '#268bd2', string: '#2aa198', number: '#d33682', boolean: '#b58900', comment: '#586e75', type: '#b58900', regex: '#dc322f', inserted: '#859900', deleted: '#dc322f', heading: '#cb4b16', tag: '#268bd2', attribute: '#b58900', entity: '#cb4b16' } },
  { id: 'catppuccin-latte', label: 'Catppuccin Latte', appearance: 'light', credit: 'based on Catppuccin (MIT)', colors: { background: '#eff1f5', text: '#4c4f69', keyword: '#8839ef', property: '#7287fd', function: '#1e66f5', string: '#40a02b', number: '#fe640b', comment: '#8c8fa1', operator: '#04a5e5', punctuation: '#7c7f93', type: '#df8e1d', regex: '#ea76cb', deleted: '#d20f39', heading: '#d20f39', tag: '#1e66f5', attribute: '#df8e1d', entity: '#dc8a78' } },
  { id: 'catppuccin-mocha', label: 'Catppuccin Mocha', appearance: 'dark', credit: 'based on Catppuccin (MIT)', colors: { background: '#1e1e2e', text: '#cdd6f4', keyword: '#cba6f7', property: '#b4befe', function: '#89b4fa', string: '#a6e3a1', number: '#fab387', comment: '#7f849c', operator: '#89dceb', punctuation: '#9399b2', type: '#f9e2af', regex: '#f5c2e7', deleted: '#f38ba8', heading: '#f38ba8', tag: '#89b4fa', attribute: '#f9e2af', entity: '#f5e0dc' } },
  { id: 'tokyo-night', label: 'Tokyo Night', appearance: 'dark', credit: 'based on Tokyo Night by enkia (MIT)', colors: { background: '#1a1b26', text: '#a9b1d6', variable: '#c0caf5', keyword: '#bb9af7', property: '#73daca', function: '#7aa2f7', string: '#9ece6a', number: '#ff9e64', comment: '#565f89', operator: '#89ddff', punctuation: '#89ddff', type: '#2ac3de', regex: '#b4f9f8', deleted: '#f7768e', tag: '#f7768e', attribute: '#bb9af7' } },
  { id: 'rose-pine', label: 'Rosé Pine', appearance: 'dark', credit: 'based on Rosé Pine (MIT)', colors: { background: '#191724', text: '#e0def4', keyword: '#31748f', property: '#c4a7e7', function: '#ebbcba', string: '#f6c177', number: '#c4a7e7', boolean: '#ebbcba', comment: '#6e6a86', operator: '#908caa', punctuation: '#908caa', type: '#9ccfd8', regex: '#eb6f92', inserted: '#9ccfd8', deleted: '#eb6f92', heading: '#c4a7e7', tag: '#9ccfd8', entity: '#ebbcba' } },
  { id: 'rose-pine-dawn', label: 'Rosé Pine Dawn', appearance: 'light', credit: 'based on Rosé Pine (MIT)', colors: { background: '#faf4ed', text: '#575279', keyword: '#286983', property: '#907aa9', function: '#d7827e', string: '#ea9d34', number: '#907aa9', boolean: '#d7827e', comment: '#9893a5', operator: '#797593', punctuation: '#797593', type: '#56949f', regex: '#b4637a', inserted: '#56949f', deleted: '#b4637a', heading: '#907aa9', tag: '#56949f', entity: '#d7827e' } },
  { id: 'vitesse-light', label: 'Vitesse Light', appearance: 'light', credit: 'based on Vitesse by Anthony Fu (MIT)', colors: { background: '#ffffff', text: '#393a34', variable: '#b07d48', keyword: '#1e754f', property: '#998418', function: '#59873a', string: '#b56959', number: '#2f798a', boolean: '#1e754f', comment: '#a0ada0', operator: '#ab5959', punctuation: '#999999', type: '#2e8f82', regex: '#ab5e3f', inserted: '#1e754f', deleted: '#ab5959', heading: '#1e754f', entity: '#a65e2b' } },
  { id: 'vitesse-dark', label: 'Vitesse Dark', appearance: 'dark', credit: 'based on Vitesse by Anthony Fu (MIT)', colors: { background: '#121212', text: '#dbd7ca', variable: '#bd976a', keyword: '#4d9375', property: '#b8a965', function: '#80a665', string: '#c98a7d', number: '#4c9a91', boolean: '#4d9375', comment: '#758575', operator: '#cb7676', punctuation: '#666666', type: '#5da994', regex: '#c4704f', inserted: '#4d9375', deleted: '#cb7676', heading: '#4d9375', attribute: '#bd976a', entity: '#c99076' } },
]

export const resolve = (colors: Colors): Record<'background' | TokenType, string> => {
  const resolved = { background: colors.background } as Record<'background' | TokenType, string>
  for (const type of tokenTypes) resolved[type] = colors[type] ?? inherit[type]?.(colors) ?? colors.text
  return resolved
}

export const themeCSS = (theme: Theme): string => {
  const colors = resolve(theme.colors)
  const rule = (selector: string, declarations: string) => `${selector} { ${declarations} }`
  return [
    `/* ${theme.label} (${theme.appearance}) — ${theme.credit} */`,
    `.kirari {\n  color: var(--kirari-text, ${colors.text});\n  background: var(--kirari-background, ${colors.background});\n}`,
    '',
    ...tokenTypes.map(type => rule(`.kirari-${type}`, `color: var(--kirari-${type}, ${colors[type]});`)),
    '',
  ].join('\n')
}

if (import.meta.main) {
  await Promise.all(themes.map(theme => Bun.write(new URL(`../themes/${theme.id}.css`, import.meta.url), themeCSS(theme))))
  console.log(`Wrote ${themes.length} themes.`)
}
