# Wishlist documentation

Start with the [local setup](../README.md#локальний-запуск) or pick the document
that covers the change you are making.

| Document | Consult for | Implementation references |
| --- | --- | --- |
| [Architecture](architecture.md) | Module boundaries, browser routes and integration | [API modules](../couple-wishlist-api/src/modules/), [web app](../wishlist-web/src/app/) |
| [Business rules](business-rules.md) | Actors, permissions, reservations and account lifecycle | [Services](../couple-wishlist-api/src/services/), [PostgreSQL E2E](../couple-wishlist-api/__tests__/e2e/app.e2e-spec.ts) |
| [API contracts](api-contracts.md) | HTTP routes, responses, errors and compatibility | [Controllers](../couple-wishlist-api/src/controllers/), [DTOs](../couple-wishlist-api/src/dto/) |
| [Database](database.md) | Relationships, constraints, migration and locking | [Entities](../couple-wishlist-api/src/models/), [migrations](../couple-wishlist-api/src/migrations/) |
| [Security](security.md) | Authentication, authorization and sensitive data | [Strategy](../couple-wishlist-api/src/strategies/jwt.strategy.ts), [auth provider](../wishlist-web/src/app/auth-provider.tsx) |
| [Deployment](deployment.md) | Local environment, builds, CI and manual cloud deployment | [Compose](../docker-compose.yml), [CI workflow](../.github/workflows/ci.yml) |
| [Git workflow](git-workflow.md) | Branch naming and pull request numbering | [Repository instructions](../AGENTS.md) |

Source code is authoritative for implemented behavior. Tests verify specific
scenarios and CI defines automated checks. The [root instructions](../AGENTS.md)
state mandatory invariants. Record implementation gaps against those invariants.

For documentation upkeep after repository changes or when checking a commit,
use the [update-doc skill](../.agents/skills/update-doc/SKILL.md).

## Agent discovery

- Codex reads `AGENTS.md` along the directory chain to its working directory.
  When starting at the root, consult the relevant application instructions
  before editing that application. Codex discovers canonical skills in
  `.agents/skills/`. [Codex instructions](https://learn.chatgpt.com/docs/agent-configuration/agents_md)
  · [Codex skills](https://learn.chatgpt.com/docs/build-skills)
- Codex GitHub review uses applicable `AGENTS.md` files. The root
  `Code Review Rules` section works independently of skill discovery. Automatic
  reviews depend on the connected repository's settings.
  [Codex GitHub review](https://learn.chatgpt.com/docs/third-party/github)
- OpenCode documents discovery of `AGENTS.md` and `.agents/skills/`. Consult the
  scoped files explicitly if your session has not loaded them.
  [OpenCode instructions](https://opencode.ai/docs/instructions/)
  · [OpenCode skills](https://opencode.ai/docs/skills/)
- Claude Code v2.1.277+ can read `AGENTS.md` directly under the documented
  session and instruction settings. Where unavailable, read the canonical
  files explicitly or use the documented `@AGENTS.md` import in a local
  `CLAUDE.md`. Open a linked `SKILL.md` manually for task-specific guidance
  when project skill discovery uses `.claude/skills/`.
  [Claude Code memory](https://code.claude.com/docs/en/memory)
  · [Claude Code skills](https://code.claude.com/docs/en/skills)

Skills use the [Agent Skills specification](https://agentskills.io/specification).
The root discovery table provides manual entry points for other clients.
Compatibility is based on published client behavior.
