# Metallic website

A responsive front-end foundation for the Metallic gaming platform, based on the supplied `refrence/Metallic — Roblox-style home.html`. Its charcoal palette, layout, game artwork, avatar artwork, and game catalog are retained and extended. The original reference is preserved unchanged. Servers appear inside individual game pages, with Groups in the Community sidebar.

## Run locally

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

## Working interactions

- Game search with keyboard-accessible suggestions, URL-backed genre filters and sorting, detailed game pages, share links, and persistent favorites.
- Outfit, accessory, and color selection with front/back previews, unsaved-change indicators, and saved looks reflected in the header and profile.
- Local game drafts with editable names, templates, descriptions, and deletion confirmation.
- Friend profiles, search, incoming requests, pending outgoing requests, request cancellation, and removal confirmation.
- Profile editing, local preference switches, notifications, and preview data reset.
- Validated signup/login preview forms and accessible pack-preview dialogs.
- Four primary top tabs, a supplementary sidebar, a keyboard-contained mobile drawer, semantic forms, preserved keyboard focus, native modal dialogs, and reduced-motion support.
- Unsaved settings protection and normalization of previously saved browser data.

Explore filters and friend tabs survive reloads and can be bookmarked. For example: `#/explore?category=Action&sort=rating` and `#/friends?tab=sent`. Community profile previews use `#/profile?user=heroX_x`. Game servers use `#/game/1?tab=servers`; groups use `#/groups` and `#/groups/metallic-studio`.

- Game pages include active-session previews, player avatars with hover/focus names, full-server and join-privacy states, friend joining, and links to the owning group or player.
- Reserved server previews cost 100 demo Alloy once. Creation supports public or invite-only access, specific friends, and allowing all friends. Reconfiguration does not charge again.
- Home friends show a compact activity popup on hover, keyboard focus, or tap, with game artwork and join controls that respect the same session access rules as game pages.
- Global search covers games, people (including your profile and saved friends), and groups, with grouped suggestions and category-filtered results. Search placeholders fade when focused.
- Friend presence uses gray for offline/hidden, blue for online, green for playing, and orange for Studio across Home, Friends, and profile friend lists. Status labels are available on hover and to assistive technology.
- Square profile group and badge tiles fit desktop and mobile layouts. The mutual-friend summary uses a text link above the friend list.
- Profile groups display membership roles and a crown badge for owned groups, using the same role data as group member lists.
- Groups include discovery, interests, open or approval-based membership, member roles, announcements, games, and local owner management. A locally created group can own a game draft through the Creator field in the game editor.

## Scale-aware foundation

Explore has genre shortcuts, discovery tabs, active filter chips and 12-card pages. Search, friends, groups, marketplace, creator libraries and profile collections have bounded result windows. The catalog repository indexes searchable metadata once and caches a bounded number of queries. An optional cancellable HTTP catalog client supports Explore and read-only game details, with loading, error and retry states.

Production builds version assets by content, combine stylesheets, emit cache policies, and enforce compressed size budgets. CI runs a 10,000-game synthetic catalog benchmark. These are frontend bounds, not a guarantee of concurrent-player capacity.

See [the scaling design](docs/scaling.md) for the API contract, implemented limits, production service boundaries, database/index guidance and launch measurements. Identity, game servers, currency, uploads and the player directory still require authoritative backend services.

## Integration boundaries

This is a browser-only prototype. All catalog activity, friends, prices, and the Alloy balance are sample data. Local non-sensitive state is stored under `metallic-demo-v1`. Login/signup validate input but do not authenticate or create accounts; emails and passwords are never stored or transmitted. Live identity, sessions, authorization, email verification, account recovery, privacy enforcement, and moderation must be implemented in a trusted backend before launch.

The launcher is explicitly unavailable until signed release artifacts and supported-platform requirements exist. The store previews illustrative packs; there is no checkout or money collection. The browser-local demo Alloy balance starts at 1,450 and is reduced by 100 when a server preview is created. It is not a real wallet. Add a trusted authoritative ledger before enabling live currency operations. Creator projects, groups, and server reservations are local previews; server creation does not provision a running server. Joining previews a launcher handoff. No group requests, messages, or friend requests are sent to real people.

## Structure

- `src/app.js`: route views, shared components, and UI event handling.
- `src/store.js`: browser-state adapter, normalization, escaping, and catalog filtering.
- `src/router.js`: route and query parsing for persistent filters and tabs, with legacy game-link support.
- `src/platform.js`: discovery ranking, filters, mutual-friend fixtures, creator categories, and marketplace sample data.
- `src/social.js`: server previews, access checks, demo Alloy transitions, game ownership, groups, and social-state migration.
- `src/avatar.js`: saved-avatar portraits and stable sample community identities.
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

GitHub Pages uses the checked production build in .github/workflows/static.yml and uploads only dist/. The previous Jekyll workflow remains as a manual compatibility entry that delegates to that same pipeline, avoiding competing automatic deployments.
