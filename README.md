# Metallic website

A responsive front-end foundation for the Metallic gaming platform, based on the supplied `refrence/Metallic — Roblox-style home.html`. Its charcoal palette, layout, game artwork, avatar artwork, and game catalog are retained and extended. The original reference is preserved unchanged; Servers is omitted from the application UI.

## Run locally

Requires Node.js 22 or newer. No dependencies or installation step.

```sh
npm run dev
npm test
npm run build
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

Explore filters and friend tabs survive reloads and can be bookmarked. For example: `#/explore?category=Action&sort=rating` and `#/friends?tab=sent`. Community profile previews use `#/profile?user=heroX_x`.

## Integration boundaries

This is a browser-only prototype. All catalog activity, friends, prices, and the Alloy balance are sample data. Local non-sensitive state is stored under `metallic-demo-v1`. Login/signup validate input but do not authenticate or create accounts; emails and passwords are never stored or transmitted. Live identity, sessions, authorization, email verification, account recovery, privacy enforcement, and moderation must be implemented in a trusted backend before launch.

The launcher is explicitly unavailable until signed release artifacts and supported-platform requirements exist. The store previews illustrative packs; there is no checkout, money collection, or wallet mutation. Add a payment provider and server-verified payment processing with an authoritative currency ledger before enabling purchases. Creator projects are browser-local planning drafts, not playable or published games. No messages or friend requests are sent to real people.

## Structure

- `src/app.js`: route views, shared components, and UI event handling.
- `src/store.js`: browser-state adapter, normalization, escaping, and catalog filtering.
- `src/router.js`: route and query parsing for persistent filters and tabs, with legacy game-link support.
- `src/platform.js`: discovery ranking, filters, mutual-friend fixtures, creator categories, and marketplace sample data.
- `src/avatar.js`: saved-avatar portraits and stable sample community identities.
- `src/catalog.js`: sample catalog extracted from the supplied reference.
- `src/reference.css`: original reference styles.
- `src/styles.css`: page additions and responsive styles.
- `src/refinements.css`: shared platform layout refinements.
- `src/platform.css`: revised navigation, profile layouts, settings sections, creator libraries, marketplace, discovery, and responsive rules.
- `public/art/`: self-contained SVG artwork extracted from the reference; no external image dependencies.
- `scripts/`: dependency-free development server and build copier.
- `tests/`: state migration, friendship transitions, filtering, routing, escaping, SVG integrity, and preview HTTP tests using the Node test runner.

The preview server listens only on loopback and serves application assets. Repository metadata and local configuration are excluded from HTTP access. Production builds replace only the generated `dist/` directory so deleted assets cannot remain in a release.

See [the verification record](docs/verification.md) for the latest review coverage.

Keep authentication, user data, wallet operations, and creator publishing behind service adapters when connecting a backend; do not treat localStorage as an authority for any live account or purchase.
