# custom.4 verification

- 1330 unit tests passed across 63 files.
- ESLint, hygiene lint, metadata and schema validation passed.
- Isolated GNOME Shell 50.1 checks passed with synthetic data: simultaneous Claude, Codex and Antigravity; independent AGY groups; brand icon; Used/Remaining/Both panel and popup settings; Full/Short/Hidden labels; provider toggles; timer/cancellation cleanup.
- Antigravity CLI 1.3.3 read-only usage JSON was verified separately. Live Claude and Codex account polling was not exercised in the isolated UI checks.

- Exact `{remaining_pct}%` stays remaining in Used and Both modes. `{weekly_remaining_pct}%` and separate session/weekly formats render correctly. `{remaining_pct}%/{display_pct}` shows `58%/42%` in Used mode for synthetic 42% usage.
