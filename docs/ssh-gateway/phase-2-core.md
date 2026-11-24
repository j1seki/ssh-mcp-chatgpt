# Phase 2 upstream v2 core

The tested source and test revision is [`bd70655`](https://github.com/j1seki/ssh-mcp-chatgpt/commit/bd7065555abf982b14eadedc2357458666bba1bf), with the shipped TOML example verified separately at [`d642f55`](https://github.com/j1seki/ssh-mcp-chatgpt/commit/d642f5515cffe6ef66bb499302d58a97495c8d58). Both are based on [upstream v2.28.0](https://github.com/tufantunc/ssh-mcp/releases/tag/v2.28.0).

## Implementation

- Stdio and bearer-authenticated Streamable HTTP create servers through the same v2 tool and resource registry. The legacy HTTP and stdio binaries, independent SSH pool, fork-only tests, and host-specific deployment scripts were retired. A clean build also removes stale binaries from existing checkouts. The upstream lockfile is unchanged.
- POSIX startup refuses root. HTTP still defaults to a loopback bind and requires bearer authentication. `SSH_MCP_HTTP_TOKEN` keeps the token out of command-line arguments. The existing bearer flag remains available as an explicit override.
- HTTP uses strict host-key verification by default. Stdio uses process-local trust on first use by default and accepts explicit pins. Both reject requests to disable verification on the gateway CLI.
- Quick-start users get the upstream operator role and the default approval policy is `ask-destructive`. The supplied TOML example also requires approval for destructive commands. Privileged operations need an explicitly configured role and host group with that permission.
- The upstream configuration schema and credential resolver, classification and authorization engine, host-key verifier, SFTP implementation and audit store remain unchanged. The tool boundary now redacts known SSH credentials from results, progress, trace fields and audit records. It refuses to put a known credential in an elicitation prompt. Malformed TOML diagnostics preserve position information and suppress parser excerpts.

## Verification

Node 22.23.3 build, typecheck, and package inspection passed. The full test run recorded **5,056 passed, 0 failed, and 27 skipped** across 144 files. The skips were 21 Windows cases, four macOS cases, the optional differential runner, and the environment-announcement test on Dropbear. The shipped TOML example loaded successfully with manual approval settings for all profiles.

| Requirement | Evidence exercised |
| --- | --- |
| v2 tool parity and startup | Built CLI tests for stdio and HTTP discovery, initialization, successful SSH tool invocation, HTTP authentication, concurrent clients and unconfigured startup. Package inspection showed the v2 entry point and no retired binaries. |
| Classification, roles, approvals | Unit and property suites for the classifier and policy engine. Built stdio approval tests cover approval and denial. Reload regression tests verify the original policy denial and audit record survive profile removal. |
| Configuration and credential resolution | Loader permissions and validation, reload, profile resolution, encrypted SSH key authentication with and without a passphrase, and real SSH password and sudo handling. |
| Host keys and SSH behavior | Real-handshake TOFU, strict pin acceptance and mismatch refusal. The bearer HTTP end-to-end test used the launcher's default strict mode with a fixture pin. Other integration cases covered bastions, background sessions, cancellation, timing limits, SFTP and supported alternate peers. |
| Credential redaction and audit | Config parse and reload diagnostic tests, MCP output and prompt tests, audit and transfer tests, and upstream sudo stdin isolation tests. Redaction covers known credential material and recognized patterns. Operators still control which remote files and outputs the gateway is able to read. |
| Startup privileges | Real UID 0 smoke check returned exit code 2 with the non-root diagnostic and no MCP output. The upstream Dockerfile remains configured to use UID 65532. |

To reproduce the core verification on a Docker-capable Linux host, use Node 22 and have `pnpm` available for the packaging test.

```bash
npm ci
npm run typecheck
docker compose --profile test up -d --build --wait
SSH_MCP_REQUIRE_SERVERS=1 npm test
```

This workstation's Docker daemon cannot start containers because its cgroup device filter fails to attach. The live test suite used isolated loopback OpenSSH and Dropbear fixtures. Encrypted-key tests provisioned and removed their own fixture public key over SSH. Docker runtime and distribution tests remain for Phase 5.

## Handoff

The verified v2 build and passing test suite satisfy the Phase 2 exit criteria. ChatGPT OAuth, MCP protocol negotiation and client approval behavior still need to be implemented and verified in Phase 3. Begin that phase only after explicit approval. Its exit evidence includes a tool invocation in an ordinary ChatGPT conversation through an authorized HTTPS test endpoint.
