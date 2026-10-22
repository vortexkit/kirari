---
'@vortexlabs/kirari': patch
---

Fix Markdown heading tokens including the trailing line break. The heading now ends at the end of its line and the line break is a separate text token, so line-based renderers and heading styles stop at the line end.
