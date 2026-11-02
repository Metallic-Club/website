# Closed-beta website

## Current behavior

The website clearly describes Metallic as an invite-only closed beta in development. Signup opens an invite form first. Username, email and password fields are not mounted until the configured server verifies the invite. Direct signup URLs and query parameters do not grant access. Navigating away clears verification. Every account flow remains a preview; no live account is created, and no password or email is sent.

There is no default accepted code. With METALLIC_BETA_API unset, invite redemption and signup remain closed. This release contains the frontend gate and API adapter, not an invitation database or issuing service. Guest browsing of the website preview remains available; an invitation is not a login session.

All player profile pictures use one neutral generic silhouette, including the current user, friends, server players, notifications and search. Group emblems are unchanged. Wardrobe shows Work in progress and Nothing to see here yet. Existing saved appearance choices remain in local preview state but are not displayed.

## Invite service contract

Set the public build variable METALLIC_BETA_API to a trusted HTTPS base URL when the verifier is ready. URLs containing credentials or query parameters are rejected. The frontend sends POST /v1/beta/invites/verify with JSON containing code (trimmed, uppercase, 8–64 alphanumeric/dash characters). Code syntax does not establish validity. The endpoint must check the actual invitation on the server.

A valid response has valid: true, an opaque server-issued ticket (20–2048 URL-safe characters), and an ISO expiresAt timestamp no more than 15 minutes in the future. Use Cache-Control: no-store and an exact allowed website origin. The client omits cookies for this verification call, keeps the ticket only in memory, clears it on navigation, and checks expiry before the signup preview can submit. Verification failures, network errors, rate limits, missing configuration and malformed responses never grant access. Codes and grants are not placed in URLs, localStorage, telemetry or built assets.

Before live account creation, add a trusted registration endpoint that validates the issued ticket again and atomically creates the account and consumes the invitation. Enforce expiry, usage limits, revocation, rate limits and replay protection in the backend. Store invite-code hashes rather than raw codes, and keep issuing credentials server-side. The frontend gate cannot replace server-side authorization. No invite is permanently redeemed merely to view the signup preview.

## Backup and branches

- Original version: codex/backup-pre-closed-beta, commit f41a0ff69a87535bf702846a1cdb87a8bbefe5ca.
- Working version: codex/closed-beta.
- Offline backup: S:/Projects/Active/Metallic-Website-Backups/pre-closed-beta-f41a0ff.bundle. The bundle includes complete history reachable from the backup branch and passed git bundle verify.

The original version can be inspected or cloned from the backup branch without overwriting current work. The tested beta commit can also be published from the configured main source branch while retaining both beta and backup refs.
