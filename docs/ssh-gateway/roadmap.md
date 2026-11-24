# SSH Gateway roadmap

SSH Gateway gives a user-operated ChatGPT custom app controlled access to the operator's configured SSH hosts. Each operator runs their own gateway, chooses their own authorization provider, and owns their SSH credentials, profiles, deployment and logs.

## Current handoff

Phase 1 has a repository audit, dependency and protocol comparison, architecture diagram, preservation checklist and migration plan. It is ready for operator review. Phase 2 requires explicit approval before implementation starts.

- [Phase 1 audit and architecture](phase-1-audit.md)
- Upstream baseline `5df4290` (v2.28.0). ChatGPT adaptation reference `e2ed9df` (v1.6.9).
- Local implementation checkpoint `960337e` includes the prior upstream sync. Its test evidence is baseline evidence. The target is one v2 execution path for both stdio and authenticated ChatGPT.
- Work resumes with Phase 2 after approval. Use a dedicated implementation branch based on the verified v2 checkpoint. Bring these planning documents onto that branch and link the branch and evidence here.

The `plan/ssh-gateway` GitHub branch tracks this roadmap independently of the implementation branch. At each phase review, record the implementation ref, concrete changes, verification commands and results, risks, blockers and the exit decision. Link future changes and evidence with commit permalinks and Actions run URLs. Keep private deployment details and credentials out of GitHub. Start the next phase after explicit operator approval. Parallel work is optional within an approved phase when tasks can be verified independently.

## Phases and gates

| Phase | State | Deliverables and exit evidence |
| --- | --- | --- |
| 1. Repository audit and architecture | Audit delivered for approval | Compare full tracked trees, versions, dependencies, APIs, security and tools. Record architecture, migration, and preservation obligations before implementation changes. |
| 2. Upstream v2 core | Awaiting approval | One supported architecture. Preserve tool schemas, stdio, existing HTTP, v2 TOML and profiles, commands, classification, authorization, approvals, SSH key checks, credentials, SFTP, audit and lifecycle. Demonstrate build, test and transport parity. Establish least-privilege gateway defaults and explicit privileged configuration. |
| 3. ChatGPT integration | Queued | Serve actual upstream tools over SDK-based `/mcp`. Provide health, structured errors, ChatGPT tool and OAuth metadata, PKCE through the authorization server, token validation and expiry, protected tool/profile access, redacted audit and secure state. Record the actual protocol and human approval behavior. Invoke a tool in an ordinary ChatGPT conversation through an authorized test endpoint before requesting the next approval. |
| 4. Local testing | Queued | Automate and document startup, health, MCP initiation and discovery, invocation, OAuth and token expiry/rejection, valid/invalid SSH credentials, command execution, read-only restrictions, privileged approval, SFTP, invalid host keys, anonymous denial, redaction, stdio and HTTP. Record commands, results and limitations. Resolve critical security failures before distribution. |
| 5. Docker and GHCR | Queued | Produce a minimal non-root image with real health reporting and bounded graceful shutdown, compose deployment, mounted TOML and external secret support. Build/publish versioned GHCR images via GitHub Actions, with multiple architectures where practical. Publish install, pin, update and rollback steps and verify a clean install from GHCR on a second authorized machine. |
| 6. Tailscale networking | Queued | Add a sidecar compose variant, private Serve, optional Funnel with public HTTPS, persistent state, operator authentication/device approval and revocation instructions. Avoid host MCP port publishing. Test reconnects, restarts and network interruptions and verify remote ChatGPT reaching the correct endpoint on the separate machine. |
| 7. Remote E2E | Queued | Deploy the published container on an operator-approved machine. Verify automatic startup, Tailscale and Funnel, remote OAuth, tool discovery and execution from an ordinary ChatGPT conversation, permission and approval enforcement, rejection of unauthorized requests, redaction, deployment and machine restart persistence, and access revocation. Record sanitized evidence, fixes and limitations. |
| 8. Security and reliability | Queued | Review authentication, authorization boundaries, OAuth/session ownership, trusted network ingress, command and output handling, privileges, secrets, SFTP/path controls, host keys and container defaults. Test concurrency, timeouts, network failure, expired credentials, restart, invalid settings, large output and client reconnection. Record remediations and verify no unresolved high or critical findings. |
| 9. Documentation and release | Queued | Publish README, architecture, install and upgrade, config and profiles, auth and approval, privacy/security, Compose/GHCR/Tailscale/Funnel, troubleshooting, rollback and uninstall. Verify an independent operator can follow the guide. Prepare a public-submission checklist and isolated reviewer fixture plan subject to platform eligibility and explicit submission authorization. |

## Prerequisites for later phase reviews

- Phase 3 needs an approved test HTTPS route, an isolated SSH fixture, and access to an ordinary ChatGPT conversation that can add custom MCP servers.
- Phases 5–7 need a Docker-capable second machine, GHCR publishing permissions, and an authorized tailnet with Funnel available where needed.
- Public directory readiness needs a reviewable public HTTPS endpoint, verified domain, reviewer login to an isolated demo, accurate tool review metadata and privacy materials. Public directory distribution of a self-hosted endpoint is an open design and eligibility question. Individual custom apps are the product acceptance target regardless of directory eligibility. [OpenAI submission process](https://developers.openai.com/plugins/deploy/submission)
