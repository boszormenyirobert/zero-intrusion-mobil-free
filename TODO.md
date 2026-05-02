## Current status

- Safe-refactor baseline achieved.
- Test coverage is 100% for statements, branches, functions, and lines.
- Full CI verification passes with `npm run test:ci`.

## Verified command

- `npm run test:ci`
- For heavier local runs, `NODE_OPTIONS=--max-old-space-size=6144` can still be used.

## Next phase

- Start behavior-preserving refactor only under the existing full regression suite.
- Keep input/output formats and runtime behavior unchanged.
- Prefer small internal cleanups first, then larger structural moves.

## Later backlog

- Add settings options for corporate client API path configuration.