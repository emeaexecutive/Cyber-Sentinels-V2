# Isolated treasury monitoring continuation

Source commit: 35ec39571d747df6cfe987884107d4c628f9eead. Branch codex/execution06-treasury-clock-20261116; worktree tmp/execution06-treasury-clock. No hosted changes or real funds.

Financial monitoring previously measured its 60-second window from the last event, so a silent tenant could keep displaying an old denial indefinitely. It now measures from observation time, rejects invalid clocks and excludes future/nonfinite event times. Fixture tests pass their declared clock explicitly; the loopback live console uses the real observation clock. No authority or payment policy is granted by monitoring.

14/14 tests pass, zero skips, including actual synthetic treasury enforcement and stale/future/foreign-tenant monitoring regressions. Changed-file ESLint exit 0. The new regression is wired into test:treasury. This is an isolated local source update, not hosted KYA/financial qualification. No full application build or new browser demo is claimed for this monitoring-only change.

KYA Registry/financial delegation integration remains partial and principal/human session fixtures remain mocked. Production and hosted financial pilot stay NO-GO. Existing local synthetic demo remains available for technical review without real funds.
