# RC6 RLS denial tests

Required deployed assertions:

| Assertion | Current result |
| --- | --- |
| Tenant A cannot read Tenant B | Blocked — no deployed run |
| Tenant A cannot update Tenant B | Blocked — no deployed run |
| User cannot read admin-only rows | Blocked — no deployed run |
| Anonymous cannot read protected rows | Blocked — no deployed run |
| Service role remains server-only | Source review only; deployed proof blocked |
| Revoked user loses access | Blocked — no deployed run |
| Admin verification boundary | Blocked — no deployed run |

Use disposable tenant fixtures in an approved staging project, remove them after the run, and retain only test IDs, timestamps, expected/actual denial codes and evidence references.
