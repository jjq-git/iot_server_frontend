# WebUiDocumentV1 contract snapshot

These files are byte-for-byte snapshots of the standalone Designer contract synced on 2026-09-21:

- `web-ui-document.v1.schema.json`
- `capabilities.v1.json`

Authoritative source: `lvgl-designer/packages/schema/schema/`. The v1 capability
snapshot currently publishes all 35 Designer widgets plus their structural child
node types (50 node types in total).

Do not edit these snapshots independently. Contract updates must start in
`lvgl-designer`, use a compatible revision or a new schema version, and update
the shared golden fixtures and IoT renderer in the same change.
