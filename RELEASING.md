# Releasing

`@vortexlabs/kirari`, `@vortexlabs/kirari-rehype`, and `@vortexlabs/kirari-react` ship to npm as public packages under the `@vortexlabs` scope. The workspace root, the docs site, and the benchmarks are private and never publish.

Versioning is driven by [Changesets](https://github.com/changesets/changesets). Each package is versioned independently. Select only the packages affected by a change when creating its changeset. For example, a React-only patch increments `@vortexlabs/kirari-react` without changing core or Rehype.

If a core update requires new integration peer ranges, the release script requires
explicit changesets for those integrations before changing any versions. It prints
the package names that need changesets, matching Vortex's release-plan validation.

## Release

```bash
bun run changeset                                     # select affected packages, bumps, and release note
bun run changelog:new                                 # scaffold the site changelog file, then fill it in
git add .changeset sites/docs/changelog && git commit -m "chore: add changeset"  # required — the release script needs a clean tree
bun run release:kirari-react                           # example: publish the React update
```

Each command uses the same `bin/release.sh` with a package filter. For example,
`bun run release:kirari-react` publishes only React, without attempting Rehype.
The filter selects what is published; Changesets applies all pending changesets
in the workspace, with each affected package receiving its own version and changelog.
Packages without a planned release keep their versions. When several packages have
changesets, run each affected package's release command. Publish core first when
the integrations require a new core version. Subsequent commands use the versions
already prepared by the first command.

There is no all-packages release command. The shared script requires `--filter`:

1. Aborts if the working tree is dirty.
2. Plans all pending releases and rejects automatic dependent bumps without an explicit changeset. Shows the version plan (or the selected package's current version when no changesets are pending) and prompts for confirmation.
3. Runs `bunx changeset version` when changesets are pending — updates affected versions and peer ranges, and writes the affected packages' `CHANGELOG.md` files.
4. Synchronizes workspace versions in `bun.lock`, then refreshes it with `bun install --lockfile-only --ignore-scripts`.
5. Runs `bun run check`: typechecks, tests, builds, the docs site, and the packed-consumer install check. A failure stops before committing or publishing.
6. Commits `chore: release` if files changed and pushes.
7. Ensures npm auth (`npm login --auth-type=web` if needed).
8. Publishes the selected package with `bun publish --access public`. The tarball is checked for unresolved `workspace:` references first. Afterwards, registry verification makes up to 41 fresh lookups, with a 10-second request timeout and 30 seconds between attempts: twenty minutes of waiting, plus request time. It explains the waiting state once, prints progress roughly every two minutes, and reports `Published and available on npm` only after confirmation. If publishing fails because an earlier lookup missed an existing version, the same verification must confirm it before continuing. If verification still fails, the last npm error is printed and the release stops without creating a tag.
9. Tags `<name>@<version>` for the selected package and pushes tags.

In an interactive terminal, a countdown updates in place between registry checks
so the wait remains visible. Captured logs keep plain progress messages. After
registry confirmation and pushing the tag, the final summary names the released
package and version, links to npm, and confirms the Git tag was pushed.

A failed release can be resumed by rerunning the same package-specific command: versions already committed are not bumped twice, and versions already on npm are skipped.

If npm reports that the package is being processed, an availability check can
still return 404 after a successful upload. A verification timeout leaves the
publication status unconfirmed. Use the `npm view` command printed by the script
to check later. Wait until the version is visible before rerunning the release
command to finish tagging; do not republish or bump the version while processing
is pending.

To retry only one package, rerun its individual release command. A version that
was previously published and then unpublished cannot be reused; it needs a new
Changeset version rather than another publish attempt. An overwrite rejection
alone is not treated as success: the version must be readable from the registry.

Run `bun run test:release` to test package selection, delayed registry visibility, release recovery, and failures without publishing or pushing. These tests also run in `bun run test` and `bun run check`.

To inspect the tarballs without publishing, run `bun run pack:preview`; archives land in `.packs/`.

## Site changelog

The docs site shows a categorized changelog at `/changelog/`, built from one Markdown file per release in `sites/docs/changelog/<package>/<version>.md`. The generated `CHANGELOG.md` files stay what npm and GitHub show.

Write the release file before running the release command, because the release runs `bun run check`, and the check fails when a version in a package's `CHANGELOG.md` has no release file. After adding a changeset, create the file:

```bash
bun run changelog:new                    # one file per package with a pending changeset
bun run changelog:new kirari-react       # only this package
bun run changelog:new kirari 1.2.3       # an explicit version
```

The command reads the upcoming version from the pending changesets, uses today's date, and never overwrites an existing file. The new file has all three section headings and no changes; fill in the ones that apply and delete the rest, because an empty section fails the check. Commit the file with the changeset. Until the package's `package.json` reaches that version, the site keeps the entry hidden, so it can be merged before the release. If the release ships on a later day, update `date`.

Every release file has the same shape. Frontmatter holds exactly `package`, `version`, and `date`, and must match the file's path. The body lists only the sections with changes, in this order: `### Breaking changes`, `### Improvements`, `### Bug fixes`. Leave out a section that has nothing in it rather than writing `None.`:

````md
---
package: kirari-react
version: 1.1.0
date: 2026-10-21
---

### Breaking changes

#### Renamed `highlightLines` to `highlighted`

`<Code>` no longer accepts `highlightLines`.

**How to migrate**

1. Rename the prop wherever you render `<Code>`.

```tsx before
<Code highlightLines={[2]}>{source}</Code>
```

```tsx after
<Code highlighted={[2]}>{source}</Code>
```

### Improvements

- One bullet per improvement.
````

Each breaking change needs a `####` title, at least one paragraph explaining it, and `**How to migrate**` followed by numbered steps. The site gives every breaking change a "Copy prompt" button that wraps its Markdown in a prompt for a coding assistant, and serves each package's published releases at `/changelog/<package>.md`, listed in `llms.txt`. Name the exact imports, types, or calls to look for in the steps, so an assistant can find affected code. Code blocks after the steps are optional; mark them `before` or `after` to label them, otherwise shell commands are labeled "Run". `bun run --cwd sites/docs check` validates the frontmatter with Zod and the body against these rules, and reports the file and line of the first problem.
