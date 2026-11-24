---
name: security-review
description: Audit Wishlist authentication, authorization, sensitive data handling, or other security controls when requested.
---

Use for a targeted security review or broader audit. Define the reviewed
surface and use the [security guide](../../../docs/security.md) and
[business rules](../../../docs/business-rules.md) as the expected policy.

1. Trace anonymous, ordinary, pending, former member, owner and reserver access
   from route guards through DTOs, queries and response serialization. Check for
   IDOR, cross-group reads, privilege escalation and mass assignment. Check
   which user fields the viewer can see on list, detail and mutation responses.
2. Inspect JWT signing and validation, bcrypt, browser token storage, session
   transitions and 401 handling. Check secret sources, sensitive logging, CORS,
   HTML or URL sinks for XSS, SQL parameterization and relevant dependency or
   configuration risk.
3. Verify with static source tracing and existing relevant tests in isolated
   environments. Keep production and shared data untouched. Redact secrets
   from review artifacts and avoid destructive testing.

Report severity, affected code and resources, the preconditions and high-level
abuse scenario, user impact and remediation. Label confirmed vulnerabilities
and unverified risks explicitly. Keep review-only requests read-only.
