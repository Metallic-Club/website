# Closed-beta website

## Current behavior

The website clearly describes Metallic as an invite-only closed beta in development. Signup opens an invite form first. Username, email and password fields are not mounted until the configured server verifies the invite. Direct signup URLs and query parameters do not grant access. Navigating away clears verification. Invited signup remains a preview; it never authenticates a user or sends credentials. Tester login requires the configured authentication service. With no service configured, sign-in is disabled.

There is no default accepted code. With METALLIC_BETA_API unset, invite redemption and signup remain closed. This release contains the frontend gate and API adapter, not an invitation database or issuing service. Only the landing, login and invite pages are public. Every other route, including direct game/profile/download links and unknown URLs, redirects to login before rendering platform content or requesting catalog data. Public navigation and guest-browse links are removed. An invitation is not a login session. Browser storage, old preview profile state and URL parameters cannot grant access.

All player profile pictures use one neutral generic silhouette, including the current user, friends, server players, notifications and search. Group emblems are unchanged. Wardrobe shows Work in progress and Nothing to see here yet. Existing saved appearance choices remain in local preview state but are not displayed.

## Invite service contract

Set the public build variable METALLIC_BETA_API to a trusted HTTPS base URL when the verifier is ready. URLs containing credentials or query parameters are rejected. The frontend sends POST /v1/beta/invites/verify with JSON containing code (trimmed, uppercase, 8–64 alphanumeric/dash characters). Code syntax does not establish validity. The endpoint must check the actual invitation on the server.

A valid response has valid: true, an opaque server-issued ticket (20–2048 URL-safe characters), and an ISO expiresAt timestamp no more than 15 minutes in the future. Use Cache-Control: no-store and an exact allowed website origin. The client omits cookies for this verification call, keeps the ticket only in memory, clears it on navigation, and checks expiry before the signup preview can submit. Verification failures, network errors, rate limits, missing configuration and malformed responses never grant access. Codes and grants are not placed in URLs, localStorage, telemetry or built assets.

Before live account creation, add a trusted registration endpoint that validates the issued ticket again and atomically creates the account and consumes the invitation. Enforce expiry, usage limits, revocation, rate limits and replay protection in the backend. Store invite-code hashes rather than raw codes, and keep issuing credentials server-side. The frontend gate cannot replace server-side authorization. No invite is permanently redeemed merely to view the signup preview.

## Tester sessions

The same public METALLIC_BETA_API base URL serves GET /v1/beta/session, POST /v1/beta/login with JSON {email,password}, and POST /v1/beta/logout with JSON {}. These requests use credentials: include, cache: no-store, redirect: error, and X-Metallic-Client: beta-website. A successful session/login JSON response must contain authenticated: true, betaTester: true, user: {id,username}, and an ISO expiresAt in the future (at most 24 hours). The server must establish identity and active beta membership; these flags are response data, never client-provided authorization. Logout must revoke the session and clear its cookie before responding successfully.

Use a Secure, HttpOnly session cookie with an appropriate SameSite policy, exact credentialed CORS origin, no-store responses, server-side expiry/revocation/membership checks, login rate limits and CSRF/origin checks on mutations. No token or credential is stored in localStorage. Session expiry, page restoration and returning to the tab trigger verification; failed verification hides the platform. No fallback preview login exists. Internal return URLs are validated and preserved for authenticated navigation.

This is a static frontend with sample fixtures, not a server authorization boundary. Public bundles/artwork remain downloadable. All real catalog, player, account and other private APIs must independently authorize the cookie-backed beta session before returning data. No live backend or beta accounts are provisioned by this change. Until that service is connected, all platform pages remain locked.

## Backup and branches

- Original version: codex/backup-pre-closed-beta, commit f41a0ff69a87535bf702846a1cdb87a8bbefe5ca.
- Working version: codex/closed-beta.
- Offline backup: S:/Projects/Active/Metallic-Website-Backups/pre-closed-beta-f41a0ff.bundle. The bundle includes complete history reachable from the backup branch and passed git bundle verify.

The original version can be inspected or cloned from the backup branch without overwriting current work. The tested beta commit can also be published from the configured main source branch while retaining both beta and backup refs.
