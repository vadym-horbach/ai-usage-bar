# custom.5 verification

- 1329 unit tests passed across 63 files.
- ESLint, hygiene lint, localization, metadata and schema validation, packaging passed.
- Isolated GNOME Shell 50.1 checks passed using synthetic data: original panel placeholders, independent session/weekly remaining, simultaneous providers, AGY icon and labels, popup Used/Remaining/Both, lifecycle cleanup.
- Saved removed-token formats migrate to explicit remaining on enable and render correctly.
- Live Claude and Codex account polling was not exercised by the isolated UI checks.
