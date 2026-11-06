# Installation

Kirari is published on npm as `kirari`. The scoped `@vortexlabs/kirari`, `@vortexlabs/kirari-react`, and `@vortexlabs/kirari-rehype` packages are unsupported: they re-export 1.x of the unscoped packages, so existing projects keep working, but they do not follow 2.0 or later. Replace them with `kirari`, `kirari-react`, and `kirari-rehype` to keep receiving updates.

```sh
npm install kirari
# or: pnpm add / yarn add / bun add kirari
```

For Markdown and MDX pipelines, add the Rehype integration. It uses your
application's Kirari through a peer dependency:

```sh
npm install kirari kirari-rehype
```

For React 19, add the React integration:

```sh
npm install kirari kirari-react
```

Documentation: <https://kirari.sh>

## Developing inside this workspace

Workspace applications can depend on the local packages directly:

```json
{
  "dependencies": {
    "kirari": "workspace:*",
    "kirari-rehype": "workspace:*",
    "kirari-react": "workspace:*"
  }
}
```

`bun run pack:preview` builds all three packages and writes their archives to
`.packs/`, which is useful for testing a release candidate in another project
before publishing.

## Verify the package boundary

```sh
bun run check:packages
```

This packs the actual packages, installs them in a fresh temporary application
outside the workspace, compiles a TypeScript consumer, and runs the built APIs
in Node and Bun. It checks all 48 language exports and the stylesheet export.
Installed paths must stay inside the temporary application; source-workspace
links cannot satisfy the check.

The check also packs the already installed HAST/Unist types and React, React DOM,
and their types into temporary archives and redirects their declared dependencies with overrides.
This makes the installation check deterministic without registry access. Those
temporary archives are removed afterwards and are not shipped with Kirari.
