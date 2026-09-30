## Change summary

Describe the user-visible outcome and the affected business domain.

## Architecture checklist

- [ ] Business UI uses the approved `Base*`, `AppIcon`, and shared UI service entry points.
- [ ] New abstractions have at least three stable consumers, or remain in the business domain.
- [ ] Authorization uses capability helpers rather than role-name comparisons.
- [ ] New visible copy exists in all eight locales.
- [ ] Light and dark themes were checked; no unexplained color literal or `!important` was added.
- [ ] Loading, empty, error, retry, keyboard, and accessibility states were checked where relevant.
- [ ] `npm run test:architecture`, `npm run lint`, `npm run lint:style`, `npm test`, and `npm run build` pass.

## Exceptions

List any architecture allowlist update with its narrow scope and reason. Write “None” when no exception is needed.
