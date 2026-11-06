# Installation

Kirari is published on npm as `kirari`. Projects that installed `@vortexlabs/kirari` keep working: that package re-exports `kirari`.

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
