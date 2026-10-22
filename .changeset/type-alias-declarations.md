---
'@vortexlabs/kirari': patch
'@vortexlabs/kirari-react': patch
---

Public object types such as `Token`, `Rule`, `Language`, `RenderOptions`, `Decoration`, `TokenPatch`, `TokenStream`, and `StreamedTokens` are now type aliases instead of interfaces. Their members are unchanged, but they can no longer be extended through declaration merging (module augmentation). Types that extend another type, such as `HighlightOptions` and `CodeProps`, remain interfaces.
