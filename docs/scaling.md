# Scaling Metallic

## Current release

This repository is a static frontend foundation. It does not run multiplayer game processes, authenticate live players, or store authoritative platform records. The 14 reference games remain sample content. No synthetic games or fictional platform totals are presented as live data.

The work in this release makes browser rendering and delivery predictable as collections grow. It does not establish million-player capacity; that needs a deployed backend, traffic model, and measured concurrency tests.

| Implemented | Bound or behavior |
| --- | --- |
| Catalog repository | Indexes searchable metadata once; stable ID tie-breaking; bounded 20-query result cache |
| Catalog pages | 12 cards per page; genre/mood/style/rating filters; direct page URLs |
| Other collections | Paged friends, marketplace, groups, creator drafts, profile favorites/groups/friends, group members and drafts |
| Preview shelves | At most 8 cards per shelf and 12 Home friends |
| Search | At most 6 preview results per category, 12 in a category page, 3 suggestions per category; 120 ms debounce |
| Notifications | At most 20 rendered entries with a link to remaining requests |
| Optional catalog HTTP client | 8 s timeout, cancellation, stale-route guards, manual retry, 30 s / 20-page cache, 200 known-game records |
| Response validation | 12 items, unique bounded IDs, safe artwork URLs, bounded text/metadata and 250 KB streamed response ceiling |
| Static delivery | Content-versioned asset directories, one CSS request, cache policy file, lazy offscreen images |
| Build budgets | Aggregate JS <=120 KiB gzip, combined CSS <=48 KiB gzip; enforced in CI. CSS allowance includes theme palettes and documentation layouts. |
| Saved preview state | Bounded collections and 512 KB parsing ceiling; remains non-authoritative |

The dependency-free browser application currently fits the budgets without adding a framework. Extract larger page modules when those budgets or measured main-thread costs warrant it. The source reference remains unchanged.

## Catalog integration

Set the public build setting METALLIC_CATALOG_API to an HTTPS API base, then run npm run build. The value is embedded in a public meta tag; credentials and secret query parameters are rejected. Empty means the local sample repository. The HTTP adapter is used by Explore and game detail routes only. Global people/group search and social flows still use local fixtures; they must be connected to the services below before launch.

The client makes anonymous GET requests with credentials omitted:

- GET /v1/games?q=...&category=...&mood=...&mode=...&rating=...&sort=players&page=1&limit=12
- GET /v1/games/:id

The list response is an object with items (up to 12) and total (a cached/materialized count). Each item has id, title, genre, rating (0–100), playing (display string), art (HTTPS URL), and metadata containing tags, mode and mood. Detail returns one item; 404 means missing. The server must enforce the page size and allowed filters itself. Personal favorites and hidden-game IDs are not sent to this public endpoint. Private recommendations belong behind authenticated service endpoints with private cache keys.

This v1 page contract is appropriate for a bounded game catalog. For large player directories, event feeds, and deep browsing, use opaque cursor pages based on a stable ordered index, with the filters and ranking version bound to the cursor. Do not implement millions of player results by downloading the directory into this frontend. A remote catalog game currently has a read-only detail view; live ownership, joins, favorites and server management need their own services.

## Production service boundaries

Serve the versioned website and image variants through a CDN. Keep HTML revalidated while assets use long-lived immutable caching. The generated _headers file is for hosts supporting that convention; the production preview server enforces the same policy. Confirm the final hosting provider's response headers before public launch, and keep prior asset revisions through deployment propagation. The private Sites deployment is not a public traffic load test.

Public game/profile indexing will also need clean route URLs, canonical links and server-rendered metadata when the live catalog is connected; the preview retains existing hash links for compatibility.

Place an authenticated API layer behind the CDN. Begin with a modular backend and a transactional relational database rather than assuming a separate microservice for every page. Split components when profiling, ownership or availability needs justify it:

| Boundary | Authority and access pattern |
| --- | --- |
| Identity and profiles | Stable opaque user IDs; unique normalized usernames; external identity provider; secure session cookies and server authorization |
| Games and discovery | Published/moderated game metadata; indexed genre/rating/order queries; cached public read models; precomputed recommendation candidates |
| Player graph and groups | Unique friendship/membership edges; role checks on every write; paged lists and counts; block/privacy checks before returning shared data |
| Presence | Expiring session heartbeats; fan-out only to authorized subscriptions; hidden status resolved before delivery; batched updates rather than per-avatar polling |
| Game sessions | Separate regional orchestrator; server-side admission/capacity/region checks; short-lived signed launcher tickets; join privacy checked at admission |
| Creator assets | Object storage and image/mesh/audio processing queues; upload quotas; asset validation and moderation before publication |
| Alloy | Transactional ledger and idempotent operations; trusted payment webhooks; never trust a balance or reservation price supplied by this browser |
| Notifications | Durable events with per-user inbox cursors; background delivery and deduplication; bounded live subscriptions |

Use connection pooling, backups with restore exercises, bounded connection counts and query timeouts. Cache public catalog pages separately from authenticated responses. Avoid a write to a single game row for every presence heartbeat: aggregate counters through queues or expiring presence storage and refresh discovery read models asynchronously.

Index for the actual query order. Examples include published games by (genre, ranking_score DESC, id), membership edges by (user_id, group_id) and (group_id, role, user_id), and friendships by (user_id, friend_id), with uniqueness constraints on edges. Use database constraints and transactions for ownership and ledger invariants. Review query plans against realistic distributions and cardinalities before selecting shards or replicas. No database schema or migration is applied by this frontend repository.

## Measurement and launch work

npm test exercises 10,000-game pagination, mixed-magnitude popularity sorting, combined metadata filters, bounded caches, malformed API responses, cancellation, timeout, retry and asset delivery. npm run benchmark reports index setup and median/p95 query times for 100 local queries over 10,000 synthetic games. It asserts rendering/cache bounds, not a hardware-dependent latency threshold. The synthetic catalog is confined to the benchmark and tests.

Those measurements do not model millions of connected players. Before a live launch, define expected concurrent users, regional distribution, game concurrency and requests per active player. Then load-test the actual services and datastore: cold/warm catalog reads, personalized reads, social writes, presence fan-out, server admission bursts, payment idempotency and failure recovery. Track p50/p95/p99 latency, errors, cache hit rate, database saturation, queue age and cost per active player. Select capacity and rollout limits from those results, and rehearse rollback. Website asset size is one useful bound, not a server capacity guarantee.

## References consulted

- [MDN HTTP caching](https://developer.mozilla.org/en-US/docs/Web/HTTP/Guides/Caching): versioned URLs and immutable caching.
- [web.dev image loading](https://web.dev/articles/browser-level-image-lazy-loading): offscreen lazy loading and reserved image dimensions.
- [PostgreSQL indexes](https://www.postgresql.org/docs/current/indexes.html): choose and verify indexes for real access patterns.

When configured for Actions, GitHub Pages publishes only dist/ after tests, the benchmark and budget checks. If Pages configuration is absent, the workflow retains the checked build artifact and skips the optional public deployment; it does not enable or change site access. Its automatic deployment is consolidated in static.yml; the retained Jekyll-named entry delegates manually to the same reusable workflow. See [GitHub custom Pages workflows](https://docs.github.com/en/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages).
