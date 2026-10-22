# Languages

Explore every opt-in language and format.

From components to configuration files. Import the definitions you need; the others stay out of your bundle.

Import from `/core` to ship only Python. The main entry always bundles JavaScript as its default.

```js
import { tokenize, render } from '@vortexlabs/kirari/core'
import { python } from '@vortexlabs/kirari/languages'

const html = render(tokenize('print("Hello, world!")', python))
```

| Language | Export |
| --- | --- |
| C | `c` |
| C# | `csharp` |
| C++ | `cpp` |
| Clojure | `clojure` |
| CSS | `css` |
| Dart | `dart` |
| Diff | `diff` |
| Dockerfile | `dockerfile` |
| Dotenv | `dotenv` |
| Elixir | `elixir` |
| GLSL | `glsl` |
| Go | `go` |
| GraphQL | `graphql` |
| Groovy | `groovy` |
| HCL | `hcl` |
| HTML | `html` |
| INI | `ini` |
| Java | `java` |
| JavaScript | `javascript` |
| JSON | `json` |
| JSONC | `jsonc` |
| JSX | `jsx` |
| Julia | `julia` |
| Kotlin | `kotlin` |
| Lua | `lua` |
| Makefile | `makefile` |
| Markdown | `markdown` |
| Nginx | `nginx` |
| PHP | `php` |
| Plain text | `plaintext` |
| PowerShell | `powershell` |
| Protocol Buffers | `protobuf` |
| Python | `python` |
| R | `r` |
| Ruby | `ruby` |
| Rust | `rust` |
| Scala | `scala` |
| Shell | `shell` |
| SQL | `sql` |
| Svelte | `svelte` |
| Swift | `swift` |
| TOML | `toml` |
| TSX | `tsx` |
| TypeScript | `typescript` |
| Vue | `vue` |
| XML | `xml` |
| YAML | `yaml` |
| Zig | `zig` |

Every definition is a named export of `@vortexlabs/kirari/languages`; bundlers keep only the ones you import. Without a bundler, import one file instead, such as `@vortexlabs/kirari/languages/python`.

JSX and TSX are separate definitions. Use `hcl` for Terraform and `shell` for common shell syntax. These are lexical grammars, not compiler parsers.
