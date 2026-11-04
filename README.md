# Metallic website — closed beta

A responsive front-end foundation for the Metallic gaming platform, based on the supplied `refrence/Metallic — Roblox-style home.html`. Its charcoal palette, layout, game artwork, avatar artwork, and game catalog are retained and extended. The original reference is preserved unchanged. Servers appear inside individual game pages, with Groups in the Community sidebar.

## Run locally

Open the hosted [Beta access preview](https://metallic-club.github.io/website/beta/index.html#/) or [Early-release preview](https://metallic-club.github.io/website/early-release/index.html#/home) directly in your browser. No setup or GitHub sign-in is required. See [browser preview details](docs/developer-previews.md) for version differences and development options.

Requires Node.js 22 or newer. No dependencies or installation step.

```sh
npm run dev
npm test
npm run build
npm run benchmark
```

Open http://127.0.0.1:4173. The production build is in `dist/`; `node scripts/serve.mjs --dist` previews it. Deploy the contents of `dist/` to any static host. Hash routing works without rewrite rules and supports hosting under a repository subpath.

## Pages

Landing `/`, login `/login`, signup `/signup`, launcher `/download`, home `/home`, explore `/explore`, wardrobe `/wardrobe`, creator hub `/create`, Alloy store `/alloy`, profile `/profile`, settings `/settings`, friends `/friends`, and game details `/game/:id`. Browser paths use `#/` before each route.

## Design, themes and creator documentation

Orange is the default accent. Settings → Themes offers dark, light and system appearance, five accent colors, large text and stronger contrast. Preferences use their own local storage key and do not affect account access. The visual refresh improves typography, mobile navigation and the creator starting flow. Sample game covers are original concept illustrations, not gameplay screenshots.

Documentation is available at `#/docs`, with getting-started guides, three tutorials and a proposed Luau-style API reference. Search, chapter links and code copying work in the preview. Engine-specific examples are clearly labeled API design proposals; Studio and a runnable Metallic SDK are not available. The beta retains its login gate. Use the browsable preview to review every page.

## Working interactions

- Game search with keyboard-accessible suggestions, URL-backed genre filters and sorting, detailed game pages, share links, and persistent favorites.
- Generic profile icons for all players. Wardrobe is a work-in-progress placeholder; previous appearance data is preserved for future development.
- Default starter templates, custom device-local templates, an asset library, and file/folder imports with drag-and-drop support.
- Friend profiles, search, incoming requests, pending outgoing requests, request cancellation, and removal confirmation.
- Profile editing, local preference switches, notifications, and preview data reset.
- Invite-gated signup with server verification, short-lived in-memory access and a fail-closed default. All platform routes require a server-verified beta tester session; sample login credentials never grant access. Invited signup remains a preview until registration is connected. Accessible pack-preview dialogs remain available.
- Three primary top tabs, Create in the sidebar, a persistent collapsible desktop icon rail, a keyboard-contained mobile drawer, semantic forms, preserved keyboard focus, native modal dialogs, and reduced-motion support.
- Unsaved settings protection and normalization of previously saved browser data.

Explore filters and friend tabs survive reloads and can be bookmarked. For example: `#/explore?category=Action&sort=rating` and `#/friends?tab=sent`. Community profile previews use `#/profile?user=heroX_x`. Game servers use `#/game/1?tab=servers`; groups use `#/groups` and `#/groups/metallic-studio`.

- Game pages include active-session previews, player avatars with hover/focus names, full-server and join-privacy states, friend joining, and links to the owning group or player.
- Reserved server previews cost 100 demo Alloy once. Creation supports public or invite-only access, specific friends, and allowing all friends. Reconfiguration does not charge again.
- Home friends show a compact activity popup on hover, keyboard focus, or tap, with game artwork and join controls that respect the same session access rules as game pages.
- Global search covers games, people (including your profile and saved friends), and groups, with grouped suggestions and category-filtered results. Search placeholders fade when focused.
- Friend presence uses gray for offline/hidden, blue for online, green for playing, and orange for Studio across Home, Friends, and profile friend lists. Status labels are available on hover and to assistive technology.
- Square profile group tiles and per-game achievement summaries fit desktop and mobile layouts. The mutual-friend summary uses a text link above the friend list.
- Profile groups display membership roles and a crown badge for owned groups, using the same role data as group member lists.
- Groups include discovery, interests, open or approval-based membership, member roles, announcements, games, and local owner management. The control panel has profile/image editing, announcements, ranked roles, granular permissions, and member-role assignment. Templates and imported files stay on the device.

## Scale-aware foundation

Explore has genre shortcuts, discovery tabs, active filter chips and 12-card pages. Search, friends, groups, marketplace, creator libraries and profile collections have bounded result windows. The catalog repository indexes searchable metadata once and caches a bounded number of queries. An optional cancellable HTTP catalog client supports Explore and read-only game details, with loading, error and retry states.

Production builds version assets by content, combine stylesheets, emit cache policies, and enforce compressed size budgets. CI runs a 10,000-game synthetic catalog benchmark. These are frontend bounds, not a guarantee of concurrent-player capacity.

See [the scaling design](docs/scaling.md) for the API contract, implemented limits, production service boundaries, database/index guidance and launch measurements. Identity, game servers, currency, uploads and the player directory still require authoritative backend services.

## Closed beta and backups

The landing page presents Metallic as an invite-only closed beta. Public signup fields are hidden until a configured invite service validates a code. Only the landing, login and invite pages are public. Without the authentication backend, platform access and registration stay closed; there are no valid codes embedded in the frontend. Set the public build value METALLIC_BETA_API when a trusted HTTPS verifier is ready. See [closed-beta.md](docs/closed-beta.md) for the endpoint contract and account-service requirements.

The pre-beta source is preserved on codex/backup-pre-closed-beta at f41a0ff69a87535bf702846a1cdb87a8bbefe5ca. The beta changes are maintained on codex/closed-beta. An offline Git bundle was also created and verified outside this checkout.

## Integration boundaries

This is a browser-only prototype. All catalog activity, friends, prices, and the Alloy balance are sample data. Local non-sensitive state is stored under `metallic-demo-v1`. Login/signup validate input but do not authenticate or create accounts; emails and passwords are never stored or transmitted. Live identity, sessions, authorization, email verification, account recovery, privacy enforcement, and moderation must be implemented in a trusted backend before launch.

The launcher is explicitly unavailable until signed release artifacts and supported-platform requirements exist. The store previews illustrative packs; there is no checkout or money collection. The browser-local demo Alloy balance starts at 1,450 and is reduced by 100 when a server preview is created. It is not a real wallet. Add a trusted authoritative ledger before enabling live currency operations. Creator projects, groups, and server reservations are local previews; server creation does not provision a running server. Joining previews a launcher handoff. No group requests, messages, or friend requests are sent to real people.

## Structure

- `src/app.js`: route views, shared components, and UI event handling.
- `src/store.js`: browser-state adapter, normalization, escaping, and catalog filtering.
- `src/router.js`: route and query parsing for persistent filters and tabs, with legacy game-link support.
- `src/platform.js`: discovery ranking, filters, mutual-friend fixtures, creator categories, and marketplace sample data.
- `src/social.js`: server previews, access checks, demo Alloy transitions, game ownership, groups, and social-state migration.
- `src/avatar.js`: shared generic profile icons and stable sample community identities.
- `src/beta-access.js`: invite verification adapter and short-lived signup gate; no accepted codes in the frontend.
- `src/beta.css`: closed-beta landing, invite forms and wardrobe placeholder.
- `src/catalog.js`: small sample/bootstrap catalog extracted from the reference.
- `src/catalog-service.js`: indexed local catalog and validated/cancellable HTTP catalog adapter.
- `src/pagination.js`: bounded collection windows and compact-count parsing.
- `src/search.js`: local directory search across sample games, people and groups.
- `src/presence.js`: shared visible activity mapping.
- `src/scale.css`: catalog discovery, page controls, loading states and shared responsive refinements.
- `src/reference.css`: original reference styles.
- `src/styles.css`: page additions and responsive styles.
- `src/refinements.css`: shared platform layout refinements.
- `src/platform.css`: revised navigation, profile layouts, settings sections, creator libraries, marketplace, discovery, and responsive rules.
- `src/social.css`: neutral discovery surfaces, game sessions, player tooltips, and group layouts.
- `public/art/`: self-contained SVG artwork extracted from the reference; no external image dependencies.
- `scripts/`: dependency-free preview server, content-versioned production builder and synthetic catalog benchmark.
- `tests/`: state migration, friendship transitions, filtering, routing, escaping, SVG integrity, and preview HTTP tests using the Node test runner.

The preview server listens only on loopback and serves application assets. Repository metadata and local configuration are excluded from HTTP access. Production builds replace only the generated `dist/` directory so deleted assets cannot remain in a release.

See [the verification record](docs/verification.md) for the latest review coverage.

Keep authentication, user data, wallet operations, and creator publishing behind service adapters when connecting a backend; do not treat localStorage as an authority for any live account or purchase.

GitHub Pages uses .github/workflows/static.yml to check and build both versions into .local/github-pages/, then publish the beta and early-release previews together. Only generated static assets are uploaded. The previous Jekyll workflow remains as a manual compatibility entry that delegates to the same pipeline.

Home uses a compact friends row, a shared Continue/Favorites library, and six recommendations. Popular lists and discovery filters live on Explore. Profiles group achievements by game with unlocked/total progress, per-game playtime, and a total playtime summary. Game pages include an Achievements tab. Gameplay records in src/game-progress.js are sample fixtures, not measured launcher activity.

The Home friends heading sits above the avatar row. Game-page friends and join controls remain visible across Overview, Achievements, and Servers. The header menu button toggles the desktop sidebar between full labels and an icon rail; mobile retains its navigation drawer.

### Profile privacy preview

Settings → Privacy & safety stores separate visibility choices for friends lists,
playtime, achievements, favorites, and groups. Each section has independent
`friends` and `others` audiences. Friends lists and favorites default to hidden
for both, including when loading older saved preview data. Owners always see
all their own sections. Whole-profile visibility takes precedence for visitors.

The owner-only “View profile as” control previews saved preferences as a friend
or another player. It only reduces the owner's view; query parameters cannot
impersonate an owner or unlock another player's sections. Sample players use
the default policy. Counts, mutual friends, per-game playtime, and linked
achievement views follow the same section policy.

These previews use local sample data, not a live privacy service. Before live
accounts ship, the backend must resolve the authenticated viewer's relationship
to the profile owner and filter private records and counts **before returning
responses**. Reuse the policy in `src/privacy.js`; never trust a requested
`viewAs`, client-supplied friendship, or local preferences as authorization.


### Sample worlds and account recognition

The preview contains 32 games and 32 example accounts. Each game has distinct
scenery artwork, without embedded names, concept captions, or player figures.
Titles remain below the artwork. `scripts/generate-concept-art.mjs` regenerates
all game illustrations. Catalog metadata, creator profiles, and sample gameplay
records cover the expanded fixtures. Game and player lists remain paginated.

Account icons appear beside names in profiles, friends, search, game creator
links, server-player tooltips, groups, and creator assets. Hover labels name each
role: platform owner (gold crown), head admin (red shield), admin (purple shield),
mod (green shield), YouTuber (red video icon), and verified (blue check).
The official example account is Metallic. AstraAdmin, AtlasAdmin, SageMod,
FramePilot, and StudioMoss demonstrate the other account types.

`src/account-roles.js` reads trusted example claims from `src/sample-accounts.js`.
Editable profile names and local storage cannot grant roles. A saved YouTube
channel URL is only a profile link. YouTuber eligibility requires verified linked
channel ownership and a trusted integer subscriber count strictly over 100,000.
Staff roles and developer/community verification are curated claims. Live account
assignment and YouTube OAuth/subscriber verification still need backend services;
these icons do not grant moderation or administrative permissions.


Both previews now show a work-in-progress Wardrobe, with no editor, saved-look
controls, or profile mannequin. All player pictures use the shared neutral
`art/profile-placeholder.svg`, including navigation, search, notifications,
friends, profiles, group members, and server previews. Activity text and dots
share `data-presence` colors: gray offline/hidden, blue online, green playing,
and orange using Studio. Activity labels use the same presence resolver and
never expose a hidden player's game.


### Community updates and Discord linking

Group member pages now group lists by role, ordered by rank, with bounded
pagination per role. Profiles show Join game only for friends whose active
session permits joining. Home friend rows include headroom for hover motion.
Profile placeholders extend through the circular crop, and the settings icon
uses an eight-tooth gear. Creator recognition icons stay inline with names.

Group News supports plain-text posts, opt-in group notifications, and a
`postNews` permission. Owners, default Admins, and default Developers can publish;
custom roles must explicitly include the permission. Posts are bounded to 100
local records with titles up to 100 and bodies up to 3,000 characters. Followers
see notifying posts in the bell popover; silent posts and the author's own posts
do not ping them. Preferences and read markers persist. This is a browser-local
preview, not cross-account delivery. Production must authorize every post and
subscription on the server, sanitize output, rate-limit publishing, and deliver
notifications only to subscribed recipients.

Settings → Linked accounts contains YouTube and Discord. With no configured
account service, Discord offers an explicitly unverified preview. Local storage
cannot create a verified Discord connection. Configure `METALLIC_CONNECTIONS_API`
at build time (HTTPS, or loopback HTTP in development) for a live account deployment.
The GitHub Pages design-preview builder always clears live API endpoints,
including this one, so these public previews cannot initiate real account linking.
The frontend expects these authenticated, uncached endpoints:

- `GET /v1/account/connections/discord`: `{linked:false}` or
  `{linked:true,verified:true,discordId:"…",username:"…"}`.
- `POST /v1/account/connections/discord/start`: `{authorizeUrl:"…"}` using
  Discord's authorization-code flow, only `identify`, a session-bound `state`,
  and a registered callback on the account-service origin.
- `DELETE /v1/account/connections/discord`: unlink/revoke, returning 204.

The account backend must verify OAuth state and Discord's issuer, exchange the
code server-side, fetch `/users/@me`, and bind the Discord user ID to the stable
Metallic account ID. Enforce one-to-one bindings and session/CSRF checks. Keep
client secrets and access/refresh tokens server-side. The official bot should
query that verified mapping through an authenticated server endpoint; editable
names, submitted Discord IDs, and browser preview flags are not identity proof.
OAuth reference: https://docs.discord.com/developers/topics/oauth2


## Storefront and game passes

Home keeps recent games, favorites, sample playtime, and friends together. Explore
uses a manual featured-game picker and a paginated list, with an optional grid.
Genres, interests, ratings, play styles, and sorting use the existing catalog
service; only 12 search results render at a time. Featured picks do not autoplay.

Each sample game has a Game passes tab with one-time cosmetic extras. Viewing a
pass opens an explicit browser-only purchase preview. Confirming deducts its cost
from `previewAlloy` and saves ownership in `gamePasses`; repeat purchases and
insufficient balances are rejected. These values are editable demo data, never
authorization, real balances, or live entitlements. A production purchase service
must use authenticated, atomic transactions and server-owned inventory. Remote
catalog games show an unconnected passes state until that service exists.
