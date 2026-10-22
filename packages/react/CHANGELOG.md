# @vortexlabs/kirari-react

## 1.1.1

### Patch Changes

- e0cd534: Public object types such as `Token`, `Rule`, `Language`, `RenderOptions`, `Decoration`, `TokenPatch`, `TokenStream`, and `StreamedTokens` are now type aliases instead of interfaces. Their members are unchanged, but they can no longer be extended through declaration merging (module augmentation). Types that extend another type, such as `HighlightOptions` and `CodeProps`, remain interfaces.

## 1.1.0

### Minor Changes

- 52ad674: Accept text children in `<Code>` the way React renders text. `<Code>let x = {count}</Code>` now highlights the joined source instead of misaligned tokens. Numbers and bigints are kept instead of dropped, and `null`, `undefined`, and booleans render nothing instead of throwing. Element children throw a `TypeError`. The `children` prop type widens from `string` to the new exported `CodeText` type.
  
  Stop `lines` and `highlightLines` from adding an empty last line wrapper after a trailing newline. The newline still follows the last wrapper, so the source text is unchanged, and blank lines before it keep their wrappers.

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
