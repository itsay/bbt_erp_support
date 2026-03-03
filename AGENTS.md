# Project Overview
This repository is a Node.js/Express ERP support integration service that receives e-commerce webhooks,
syncs orders and related data, and bridges operational flows between Omisell and MISA using MongoDB,
Redis, and scheduled jobs. It exposes API endpoints under `/v1`, ingests webhook events under
`/webhook`, serves a web UI from `public/`, and runs background cron jobs for periodic synchronization.

## Repository Structure
- `common/` — shared enums and constants used across routes and services.
- `docs/` — documentation workspace (currently only `docs/SubAgent/` exists and is empty).
- `model/` — Mongoose models for users, tracking, Omisell orders, and MISA config entities.
- `public/` — static frontend assets (HTML, CSS, JS, AdminLTE, Angular controllers).
- `route/` — Express route modules and controllers (user, webhook, MISA, Omisell, tracking, utilities).
- `seed/` — one-off data seed scripts (for example MISA config migration/seed).
- `service/` — business services for scheduler logic and external API/database integration.
- `test/` — ad hoc and integration-style Node scripts for manual verification and backfill tasks.
- `index.js` — main clustered web server entrypoint.
- `scheduler.js` — standalone scheduler process entrypoint.
- `.env_sample` — environment variable template for local setup.
- `location-misa.json` — static location/config mapping data.

## Build & Development Commands
Install dependencies:
```bash
npm install
```

Run web API server:
```bash
node index.js
```

Run scheduler worker:
```bash
node scheduler.js
```

Run tests (existing `package.json` script, verbatim):
```bash
npm test
```

Run integration/ad hoc scripts directly:
```bash
node test/testScheduler.js
node test/misa/testMisa.js
node test/omisell/testOrders.js
node test/omisell/testOrderDetails.js
node test/omisell/backfillOrders.js
node test/fix/fixFailedWebhook.js
```

Seed MISA config data:
```bash
node seed/misa-config-seed.js
```

Debug locally (Node inspector):
```bash
node --inspect index.js
node --inspect scheduler.js
```

Lint:
```bash
echo "TODO: No lint script/config is defined in package.json"
```

Type-check:
```bash
echo "TODO: No TypeScript or type-check script is configured"
```

Deploy:
```bash
echo "TODO: No deployment command/workflow is defined in this repository"
```

## Code Style & Conventions
- Runtime is CommonJS JavaScript (`require`/`module.exports`) on Node.js.
- Keep route handlers/controllers in `route/**`, business logic in `service/**`, and schemas in `model/**`.
- File naming is mostly lowercase with suffix patterns such as `*.controller.js`, `*.service.js`,
	and model-centric names like `misa-config.js`.
- Follow existing formatting in touched files (current codebase uses semicolons inconsistently).
- No ESLint/Prettier config is present.
> TODO: Add and enforce formatter/linter configuration (for example ESLint + Prettier).
- Commit message convention is not defined in-repo.
> TODO: Standardize commit messages; suggested template: `<type>(<scope>): <summary>`.

## Architecture Notes
```mermaid
flowchart TD
		A[External Platforms\nOmisell/Webhook Sources] --> B[/webhook endpoint\nroute/webhook.js]
		B --> C[Webhook Controllers\nroute/webhook/webhook.controller.js]
		C --> D[Service Layer\nservice/misa/* + service/omisell/*]
		D --> E[(MongoDB)]
		D --> F[(Redis)]

		G[Scheduler Process\nscheduler.js] --> H[SchedulerService\nservice/scheduler.service.js]
		H --> I[Cron Jobs]
		I --> D

		J[Web API Process\nindex.js + cluster] --> K[/v1 routes\nroute/home.js]
		K --> L[User/MISA/Tracking Controllers]
		L --> D
		J --> M[Static UI\npublic/]
```

`index.js` starts a clustered Express app, serves static frontend assets, mounts `/v1` business APIs,
and forwards webhook traffic to `/webhook`. Controllers in `route/**` call services in `service/**` to
interact with Omisell/MISA and persist data in MongoDB (`model/**`), with Redis used for cache/utility
support. `scheduler.js` runs independently to execute cron-driven jobs in `service/scheduler.service.js`.

## Testing Strategy
1. Current repository testing is script-driven and integration-oriented, not framework-based unit tests.
2. Run baseline scripts manually with Node (examples in `test/`, see commands above).
3. Validate scheduler behavior via `node test/testScheduler.js` and service/API flows via
	 `test/misa/*` and `test/omisell/*` scripts.
4. CI workflow files are not present under `.github/`.
> TODO: Add CI pipeline to run smoke/integration scripts on pull requests.
> TODO: Add unit-test framework (for example Jest) and define coverage targets.
> TODO: Define e2e scope (API-level vs UI-level) and automation toolchain.

## Security & Compliance
- Secrets are expected from environment variables; use `.env_sample` as a template and never commit real
	credentials (for example API keys and database URIs).
- Keep `.env` local and rotate keys when sharing or recovering environments.
- Dependency and vulnerability scanning are not configured in-repo.
> TODO: Add dependency scanning (`npm audit`, Dependabot, or equivalent in CI).
- Webhook and login endpoints should be reviewed for auth, signature validation, and rate limiting.
> TODO: Document webhook signature verification and replay protection policy.
- License metadata in `package.json` is `ISC`.
> TODO: Confirm third-party asset license compliance for vendored frontend libraries in `public/`.

## Agent Guardrails
1. Do not modify minified/vendor assets under `public/AdminLTE/**` and `public/js/*.min.js` unless the
	 task is explicitly a dependency/vendor update.
2. Do not commit secrets, `.env`, or credential values; use placeholders only.
3. Keep changes scoped: avoid broad refactors across `route/`, `service/`, and `model/` in one task.
4. For schema or data migration changes, include rollback notes and backup guidance.
5. Treat scheduler and webhook changes as high risk; require human review before merge.
6. Respect external API limits for Omisell/MISA calls.
> TODO: Define explicit per-endpoint/per-job rate limits and retry budgets.

## Extensibility Hooks
- Environment variables in `.env_sample` control runtime endpoints and infrastructure:
	`PRODUCTION`, `WEB_PORT`, `REDIS_HOST`, `REDIS_PORT`, `MONGODB`, `OMISELL_API_*`.
- New scheduled tasks can be added by extending `JOB_DEFINITIONS` in
	`service/scheduler.service.js`.
- API surface can be expanded by adding controllers and mounting routes under `route/home.js`.
- Data entities can be extended by adding/updating Mongoose models in `model/` and related services.
- Seed/migration hooks live in `seed/` for one-off data backfills.
> TODO: Document feature flags and staged rollout strategy (not currently defined).

## Further Reading
- [docs/SubAgent/](docs/SubAgent/)
- [index.js](index.js)
- [scheduler.js](scheduler.js)
- [service/scheduler.service.js](service/scheduler.service.js)
- [route/home.js](route/home.js)
- [route/webhook.js](route/webhook.js)
- [seed/misa-config-seed.js](seed/misa-config-seed.js)
> TODO: Add architecture deep-dive docs (for example `docs/ARCH.md`, ADRs, and runbooks).
