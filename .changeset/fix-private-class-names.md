---
'@vortexlabs/kirari': patch
---

Fix JavaScript and TypeScript private class names such as `#count` being split into a `#` text token and a separate name. They are now one token, highlighted as a property, or as a function for private methods.
