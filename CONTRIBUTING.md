# Contributing

Thanks for helping with Kirari. This guide covers reporting issues, setting up the workspace, and opening pull requests.

## Reporting issues

- Search [existing issues](https://github.com/vortexkit/kirari/issues) first.
- Use the bug report form and include a minimal reproduction: the package and version, the language, the theme, the input snippet, and the expected and actual output.
- For new languages, themes, or APIs, use the feature request form and describe the problem before the solution.
- Never report security vulnerabilities in a public issue. See [SECURITY.md](SECURITY.md).

## Setup

Kirari is a [Bun](https://bun.sh) workspace. Use the version in the root `package.json` (`packageManager`).
Use Node.js 26 for development; the root `.nvmrc` selects this version.

```sh
bun install
bun run dev
```

See the [README](README.md) for the full list of scripts.

| Path | Contents |
| --- | --- |
| `packages/kirari` | Core library, language definitions, and themes |
| `packages/rehype` | Rehype and MDX integration |
| `packages/react` | React component and streaming hook |
| `sites/docs` | Documentation site |
| `packages/benchmarks` | Speed and bundle-size benchmarks (private) |

[ARCHITECTURE.md](ARCHITECTURE.md) maps how the core package fits together.

The core package has no runtime dependencies. Keep it that way: integration dependencies belong in `packages/rehype` or `packages/react`.

## Making changes

1. Branch from `main`.
2. Add or update tests next to the code you change. Language fixes should come with a fixture in the correctness corpus (`bun run test:corpus`).
3. Run the full check before pushing. It is the same gate the release and CI use:

   ```sh
   bun run check
   ```

4. Add a changeset for any change users will notice:

   ```sh
   bun run changeset
   bun run changelog:new
   ```

   The three published packages are versioned independently, so select each affected package and its bump. Docs-only, test-only, and internal changes do not need one.

   `changelog:new` scaffolds the docs site release file for each pending changeset. Fill in its sections and commit it with the changeset, because `bun run check` fails when a version has no release file. See [Site changelog](RELEASING.md#site-changelog).

## Commits

Use [Conventional Commits](https://www.conventionalcommits.org) with a scope where it helps:

```
feat(react): add line number support
fix(rehype): keep unknown fence languages unchanged
test(release): cover registry lag
docs: expand installation guide
```

Keep each commit focused on one change.

## Pull requests

The [CI workflow](.github/workflows/ci.yml) runs on pull requests and pushes to all branches, including `main`.
It installs the frozen lockfile with the Bun version from `package.json`, uses
Node.js 24 and 26 in a matrix, and runs `bun run check` on each. This covers linting,
types, tests, package and docs builds, and installing packed packages outside the
workspace. The separate browser harness still needs to be opened in a browser;
CI does not execute it.

- **Issue first.** Every pull request closes an issue. Open one (or find the existing one)
  before you open the pull request, then put `Closes #<issue>` in its description. A pull
  request with no linked issue fails the [Linked issue](.github/workflows/linked-issue.yml)
  check and won't be reviewed.
- Describe what changed and why.
- Keep pull requests small. Split unrelated changes.
- Make sure `bun run check` passes and a changeset is included when needed.

## Releases

Releases are made by maintainers. See [RELEASING.md](RELEASING.md).

## License

By contributing, you agree that your contributions are licensed under the [MIT License](LICENSE).
