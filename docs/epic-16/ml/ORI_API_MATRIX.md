# ORI API Matrix

| Existing route | Method | Access | ORI behavior | Boundaries |
| --- | --- | --- | --- | --- |
| `/api/ml/status` | GET | Admin authentication and verified admin access | Returns mode, model/schema/threshold versions, hashes, validation status, and non-enforcement boundary | No activation, inference request, tenant input, model upload, or stack trace |
| `/api/admin/reviews` | GET | Admin authentication and verified admin access | Returns at most 100 unreviewed sanitized ORI records with the existing review queues | Bounded response; no raw feature payload or arbitrary export |
| `/api/admin/reviews` | POST | Admin authentication and verified admin access | Records an attributed immutable ORI reviewer outcome through a service-role-only database function | Reviewer identity comes from the authenticated session; notes capped at 2,000 characters; no online learning |

No new public route was added. Runtime inference remains an internal call from the existing Trust Execution Pipeline. Tenant identity is resolved from the authenticated `trust_cases` query and cannot be supplied or overridden by a request body. There is no raw model upload or public model-administration route.
