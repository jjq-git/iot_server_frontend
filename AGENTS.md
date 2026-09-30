# Repository instructions

## Scope

This repository is a Vue 2 + BootstrapVue frontend. Keep changes incremental and preserve existing business behavior, routes, API contracts, permissions, and all eight locales.

## Required practices

- Use `src/api/http.js` through resource modules in `src/api/`; do not import axios directly in views or components.
- Use lazy-loaded route components and i18n keys for route titles and visible UI copy.
- Add every new i18n key to `zh-CN`, `zh-TW`, `en-US`, `de-DE`, `ja-JP`, `fr-FR`, `es-ES`, and `ko-KR`.
- Prefer the approved `Base*` components and shared UI services. Direct third-party primitives require an explicit architecture allowlist entry.
- Use capability helpers from `src/utils/permission.js`; do not infer authorization from role strings in views.
- Use semantic CSS tokens. Do not add hard-coded theme colors or unexplained `!important` declarations.
- Keep business semantics out of `components/base/`. Shared business-neutral compositions belong in `components/shared/`.
- Do not commit credentials, deployment hosts, local runtime state, generated PDFs, `dist/`, or `node_modules/`.
- Preserve unrelated working-tree changes.

## Verification

Run the checks relevant to the change. Before completing a broad refactor, run:

```bash
npm ci
npm run lint
npm run lint:style
npm test
npm run build
```

If an architecture guard has a documented exception, update the allowlist with a concise reason instead of bypassing the guard inline.
