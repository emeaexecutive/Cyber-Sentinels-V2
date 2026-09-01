# Cyber Sentinels Docker Runbook

## Purpose and boundary

Docker provides a portable Node 22 development, release-qualification, and recovery environment. Cyber Sentinels Production remains Vercel plus Supabase. Docker is not a second Production platform and must never receive Production credentials during ordinary qualification.

The image uses a three-stage build: locked dependencies (`npm ci`), a conditional Next.js standalone build, and a non-root Node runtime containing only traced runtime files, static assets, public assets, and the application’s explicit Markdown allowlist. Vercel builds do not set `CYBER_SENTINELS_DOCKER_BUILD`, so their existing output mode is unchanged.

## Prerequisites on Windows

- Windows 11 with hardware virtualization enabled.
- Docker Desktop configured for Linux containers and the `desktop-linux` context.
- WSL 2.1.5 or newer.
- PowerShell opened in the repository root.

This workstation’s observed failure mode—Docker Desktop reporting `hasNoVirtualization` while `wsl --status` says WSL is not installed—requires a one-time Windows host repair. In **Administrator PowerShell** run:

```powershell
wsl --install --no-distribution
Restart-Computer
```

After Windows restarts, run:

```powershell
wsl --update
wsl --version
docker desktop start
docker desktop status
docker context use desktop-linux
docker version
docker info
docker buildx version
docker compose version
```

Do not continue until `docker version` shows both Client and Server sections and `docker info` returns a Server section.

## Build

The direct reproducible build is:

```powershell
docker build --progress=plain --build-arg BUILD_VERSION=(git rev-parse HEAD) -t cyber-sentinels-v1 .
```

The exact-SHA qualification command builds a SHA-tagged image and performs all safe runtime checks:

```powershell
npm run docker:verify
```

Node 22.23.1 is pinned in the Dockerfile. The final image must report a `v22` runtime and user `node`.

## Safe local run

`.env.docker.example` is deliberately executable and contains no real credential. It proves liveness and the public API surface while readiness truthfully reports missing local Supabase/service-role configuration.

```powershell
docker run --rm --env-file .env.docker.example --add-host host.docker.internal:host-gateway -p 3000:3000 cyber-sentinels-v1
```

In another PowerShell window:

```powershell
Invoke-RestMethod -Uri 'http://localhost:3000/api/health'
try { Invoke-RestMethod -Uri 'http://localhost:3000/api/ready' } catch { $_.ErrorDetails.Message }
Invoke-RestMethod -Uri 'http://localhost:3000/api/v1/openapi.json'
```

Expected safe-local result:

- `/` returns HTTP 200.
- `/api/health` returns HTTP 200 with `status=ok` and `probe=liveness`.
- `/api/ready` returns HTTP 503 with an explicit missing/dependency reason until approved non-Production Supabase configuration is supplied.
- `/api/v1/openapi.json` returns a populated OpenAPI document.

Readiness must not be made green by weakening dependency checks.

## Compose

Compose adds the same safe env, host gateway, read-only filesystem, temporary cache mounts, dropped capabilities, and `no-new-privileges`:

```powershell
docker compose up --build
```

Stop and remove the Compose container and network with:

```powershell
docker compose down
```

Compose does not start PostgreSQL or emulate Supabase.

## Environment variables

| Class | Variables | Docker behavior |
|---|---|---|
| Build-time public | `NEXT_PUBLIC_SITE_URL`, `NEXT_PUBLIC_APP_URL`, `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `NEXT_PUBLIC_TURNSTILE_SITE_KEY`, `NEXT_PUBLIC_ENABLE_DEV_AUTH` | Non-secret local defaults are compiled into the generic image. Approved Staging values may be supplied as build arguments. Production values are forbidden for ordinary Docker qualification. |
| Runtime public | The same `NEXT_PUBLIC_*` names | Available to server-side runtime code, but client bundles retain their build-time public values. |
| Server-only | `SUPABASE_SERVICE_ROLE_KEY`, `API_KEY_PEPPER`, `API_KEY_ROTATION_SECRET`, `API_EXECUTION_SIGNING_SECRET`, `TURNSTILE_SECRET_KEY`, provider/webhook/database credentials | Runtime env only. Never use Docker `ARG`, Dockerfile `ENV`, tracked files, or image layers. |
| Environment identity | `CYBER_SENTINELS_ENVIRONMENT`, `CYBER_SENTINELS_PUBLIC_ORIGIN` | Must be `local`, `test`, or `staging` and must not resolve to the Production origin. |
| Optional | Disabled provider, ML, Stripe, OpenAI, and synthetic controls | Remain absent or safely disabled unless an approved non-Production qualification explicitly needs them. |
| Production-only | Production Supabase ref, canonical Production origin, Production secrets | Rejected by `npm run docker:verify`. |

To use an approved untracked Staging env file, set only its path in the current PowerShell process:

```powershell
if (-not (Test-Path -LiteralPath '.env.docker.staging.local')) { throw 'Create the approved untracked Staging env file first.' }
$env:CYBER_SENTINELS_DOCKER_ENV_FILE = '.env.docker.staging.local'
npm run docker:verify
Remove-Item Env:CYBER_SENTINELS_DOCKER_ENV_FILE
```

The verifier prints variable status and proof metadata only. It never prints env values.

## Health, readiness, logs, and stop

```powershell
docker ps
docker inspect --format '{{json .State.Health}}' cyber-sentinels-v1-local
docker logs cyber-sentinels-v1-local
docker stop cyber-sentinels-v1-local
```

When a persistent diagnostic container name is useful, start it explicitly:

```powershell
docker run --name cyber-sentinels-v1-local --env-file .env.docker.example --add-host host.docker.internal:host-gateway -p 3000:3000 cyber-sentinels-v1
```

Review logs before sharing them. The automated verifier rejects secret-shaped output.

## Rebuild and reproducibility

```powershell
$sha = git rev-parse HEAD
docker build --progress=plain --build-arg BUILD_VERSION=$sha -t cyber-sentinels-v1:$($sha.Substring(0,12))-a .
docker build --no-cache --progress=plain --build-arg BUILD_VERSION=$sha -t cyber-sentinels-v1:$($sha.Substring(0,12))-b .
docker run --rm --entrypoint node cyber-sentinels-v1:$($sha.Substring(0,12))-a --version
docker run --rm --entrypoint node cyber-sentinels-v1:$($sha.Substring(0,12))-b --version
```

Both builds must use the same source SHA and Node major and must pass health and OpenAPI checks. Byte-identical image digests are not claimed because base-image metadata and build timestamps may differ.

## Safe Staging qualification and Customer Zero

Use only an approved, untracked Staging env file whose Supabase URL resolves to `agpyhygpfmppjkxwcpac`. Never copy Production Vercel variables into a file. `npm run docker:verify` rejects the Production environment, canonical Production origin, and Production Supabase ref before it contacts Docker.

After the Docker gateway passes, point Agent Gamma at `http://localhost:3000` using its existing secure Staging API credential injection. Do not place that credential in the image, Compose file, command line, repository, screenshot, or logs. Reuse an existing qualified fixture where possible; do not duplicate canonical Staging data merely to exercise Docker.

## Recovery rehearsal

Docker may host disposable PostgreSQL for an explicitly authorized restore rehearsal, but that is a separate workflow. It must use an encrypted, private backup outside the repository, a non-Production target, process-only credentials, verified checksums, and cleanup after proof. The application Compose service intentionally does not start a database.

## Security boundaries

- The final container runs as the non-root `node` user and exposes only port 3000.
- The image contains no `.git`, env files, tests, local artifacts, reports, database dumps, keys, credentials, Production proof, or backup material.
- Secrets enter at runtime only.
- The Docker healthcheck uses Node and `/api/health`; it does not convert dependency failure into liveness failure.
- `/api/ready` remains the authoritative dependency/release probe.
- Docker qualification is forbidden from Production configuration and mutation.

## Troubleshooting

`Cannot connect to ... dockerDesktopLinuxEngine` or `hasNoVirtualization=true`:

1. Confirm `wsl --version` returns a version of at least 2.1.5.
2. If WSL is absent, perform the Administrator PowerShell repair in Prerequisites and restart Windows.
3. Confirm Docker Desktop uses the WSL 2 engine and Linux containers.
4. Run `docker context use desktop-linux`, then `docker desktop start`.
5. Require both Client and Server output from `docker version` before retrying.

`/api/ready` returns 503 with `.env.docker.example`:

This is expected. The example deliberately contains no service-role credential or database. Supply an approved non-Production runtime env only when dependency qualification is intended.

`Port 3000 is already allocated`:

```powershell
$env:CYBER_SENTINELS_DOCKER_PORT = '3100'
npm run docker:verify
Remove-Item Env:CYBER_SENTINELS_DOCKER_PORT
```
