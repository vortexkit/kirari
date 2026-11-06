# Security policy

## Supported versions

Only the latest published version of `kirari`, `kirari-rehype`, and `kirari-react` receives security fixes. The `@vortexlabs/kirari`, `@vortexlabs/kirari-rehype`, and `@vortexlabs/kirari-react` packages re-export them and receive the same fixes on update.

## Reporting a vulnerability

Do not open a public issue. Report vulnerabilities privately through [GitHub security advisories](https://github.com/vortexkit/kirari/security/advisories/new).

Include:

- the affected package and version
- a description of the issue and its impact
- steps or a minimal input that reproduces it

You will get an acknowledgement within a few days. Once a fix is released, the advisory is published with credit to the reporter unless you prefer otherwise.

## Scope

Kirari turns untrusted source code into tokens, HTML, and React elements. Issues of particular interest include:

- markup or script injection through highlighted output
- inputs that cause catastrophic backtracking or unbounded work
- unsafe handling of user-supplied languages, themes, or decorations
