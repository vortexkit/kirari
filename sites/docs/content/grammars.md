# Custom grammars

Extend definitions with your own rules and categories.

Copy a definition and put your rules first. Each rule matches at the current source position; earlier rules win.

```js
import { javascript } from '@vortexlabs/kirari/languages'
import type { Language } from '@vortexlabs/kirari'

const projectJavaScript: Language = {
  ...javascript,
  rules: [
    { type: 'constant', pattern: /\bAPI_KEY\b/ },
    ...javascript.rules,
  ],
}
```

```css
.kirari-constant {
  color: var(--kirari-constant, #99631b);
}
```

Definitions can specify keywords, types, identifier patterns, and rules. An optional `tokenize(source, language)` callback can replace the scanner for structural syntax. Return complete tokens with contiguous source offsets. An optional `definitions(tokens)` callback runs after tokenizing and can retype names as functions; built-in definitions that classify function definitions set it, and spreading a built-in keeps it even when renamed.

Templates, regex literals, and structural scanners can handle syntax before ordinary rules. Rules do not override every construct in JSX, Vue, Svelte, HTML, CSS, or YAML. Definitions and callbacks are trusted application code.
