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

Landing `/`, login `/login`, signup `/signup`, launcher `/download`, home `/home`, explore `/explore`, wardrobe `/wardrobe`, creator hub `/create`, Alloy store `/alloy`, profile `/profile`, settings `/settings`, friends `/friends`, and experience details `/experience/:id`. Browser paths use `#/` before each route.

## Working interactions

- Experience search, genre filtering, sorting, detail pages, and persistent favorites.
- Outfit and color selection, live avatar preview, save and reset.
- Local experience drafts with template selection, details, and deletion confirmation.
- Friend search, sample friend requests, accept/decline, discovery, and removal confirmation.
- Profile editing, local preference switches, notifications, and preview data reset.
- Validated signup/login preview forms and accessible pack-preview dialogs.
- Responsive navigation, semantic forms, keyboard focus, native modal dialogs, reduced-motion support.

## Integration boundaries

This is a browser-only prototype. All catalog activity, friends, prices, and the Alloy balance are sample data. Local non-sensitive state is stored under `metallic-demo-v1`. Login/signup validate input but do not authenticate or create accounts; emails and passwords are never stored or transmitted. Live identity, sessions, authorization, email verification, account recovery, privacy enforcement, and moderation must be implemented in a trusted backend before launch.

The launcher is explicitly unavailable until signed release artifacts and supported-platform requirements exist. The store previews illustrative packs; there is no checkout, money collection, or wallet mutation. Add a payment provider and server-verified payment processing with an authoritative currency ledger before enabling purchases. Creator projects are browser-local planning drafts, not playable or published experiences. No messages or friend requests are sent to real people.

## Structure

- `src/app.js`: route views, shared components, and UI event handling.
- `src/store.js`: browser-state adapter, normalization, escaping, and catalog filtering.
- `src/catalog.js`: sample catalog extracted from the supplied reference.
- `src/reference.css`: original reference styles.
- `src/styles.css`: page additions and responsive styles.
- `public/art/`: self-contained SVG artwork extracted from the reference; no external image dependencies.
- `scripts/`: dependency-free development server and build copier.
- `tests/`: meaningful state, filtering, and input-escaping tests using the Node test runner.

Keep authentication, user data, wallet operations, and creator publishing behind service adapters when connecting a backend; do not treat localStorage as an authority for any live account or purchase.
