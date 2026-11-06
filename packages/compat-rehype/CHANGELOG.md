# @vortexlabs/kirari-rehype

## 1.1.0

### Minor Changes

- ef4462a: Publish under unscoped names: `kirari`, `kirari-react`, and `kirari-rehype`. The `@vortexlabs/kirari`, `@vortexlabs/kirari-react`, and `@vortexlabs/kirari-rehype` packages now re-export them, so existing imports keep working.

### Patch Changes

- Updated dependencies [ef4462a]
  - kirari@1.2.0
  - kirari-rehype@1.1.0

## 1.0.2

### Patch Changes

- 52ad674: Stop line wrappers from adding an empty last line after a code block's trailing newline. Markdown code blocks always end with a newline, so every block rendered with `lines` or fence line metadata such as `{2,4-6}` showed an extra empty line, and an extra number when line numbers come from CSS. The newline still follows the last wrapper, so the source text is unchanged, and blank lines before it keep their wrappers.

## 1.0.1

### Patch Changes

- 3ee99c0: Update the package homepage and documentation links to https://kirari.sh.

## 1.0.0

### Major Changes

- 14accd0: Release Kirari 1.0.0 with the core syntax highlighting APIs, Rehype and MDX integration, and React components and streaming hooks. Update the integrations to require Kirari 1.x.

### Patch Changes

- Updated dependencies [14accd0]
- Updated dependencies [149d19f]
  - @vortexlabs/kirari@1.0.0

## 1.0.0

### Major Changes

- Release Kirari 1.0.0 with the core syntax highlighting APIs, Rehype and MDX integration, and React components and streaming hooks. Update the integrations to require Kirari 1.x.

### Patch Changes

- Updated dependencies
  - @vortexlabs/kirari@1.0.0
