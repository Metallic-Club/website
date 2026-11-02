# Website review

Reviewed November 1, 2026. The supplied Metallic reference remains the basis of the visual design. Servers are part of individual game pages; Groups appears under Community.

## Automated verification

`npm test` covers 48 checks:

- Standalone SVG XML casing and internal paint references.
- Global games/people/groups search, including custom groups, own profile, deduplication, and empty queries.
- Profile memberships, role labels, owner badges, pending requests, and leaving groups.
- Home friend activity follows session membership and joins-off checks.
- Presence maps offline/hidden/invisible, online, gameplay, and Studio consistently; hidden activity takes priority over gameplay.
- Search, genre filtering, rating sorting, and popular sorting without catalog mutation.
- Browser-state persistence and fallback when storage is corrupt or unavailable.
- Safe rendering of user-entered content.
- Incoming and outgoing friendship transitions, including duplicate prevention.
- Normalization, size limits, and deduplication of stored records.
- Bookmarkable filters and tabs, invalid query values, and special characters in searches.
- Preview HTTP asset delivery, HEAD handling, unsupported methods, and exclusion of repository/configuration files.

The production build and JavaScript syntax checks also pass. GitHub Actions runs the tests and builds the static output on every push and pull request.

## Browser review

All requested pages, game details, community profiles, and missing-page routes were inspected. No broken images or unexpected browser errors were found. There is no standalone Servers sidebar tab.

Responsive coverage includes desktop, tablet widths of 768 and 1024 pixels, and mobile widths of 320 and 390 pixels. The requested pages fit without horizontal page overflow; shelves and category lists deliberately scroll horizontally.

Exercised in the browser:

- Grouped global search suggestions, Games/People/Groups result tabs, direct profile/group links, empty results, and URL reload persistence.
- Home friend popup placement, join preview, joins-off state, keyboard entry, Escape dismissal with focus restoration, and mobile layout.
- Search placeholder fades on focus in the header, Explore, Friends, Marketplace, and Groups.
- Square profile group and badge tiles remain square without overflow at desktop, 320, 390, and 768 pixels. Group roles and owner crowns remain visible.
- Profile mutual-friend summaries retain the text link and tab without miniature avatars.
- Friend lists use gray offline/hidden, blue online, green playing, and orange Studio dots, with accessible status labels. Sample sessions agree with player activity.
- Profile group cards show owner crowns and Admin/Developer/Member roles; personal groups remain after reload.
- Filtered results, rapid category/sort changes, and reload persistence.
- Wardrobe work-in-progress placeholder, no inventory/save controls, and generic player icons across all profile and social views.
- Friend request creation, pending state, persistence, cancellation, and profile navigation.
- Creator draft creation, editing, and reload persistence.
- Mobile drawer navigation and protection of unsaved settings.
- Signup preview validation, password visibility, and recovery information. Guest platform access is now removed.
- Play-preview and Alloy-pack dialogs, including disabled checkout.

## Integration limits

This remains a front-end foundation. Live authentication, gameplay, server provisioning, launcher artifacts, payments, authoritative balances, cross-account privacy enforcement, collaboration, and publishing are not connected. Sample community activity and illustrative prices are labeled as preview content. Browser checks do not substitute for backend integration tests or a full assistive-technology audit.

## Requested platform revisions

- Top navigation is Home, Explore, Wardrobe, Create. Sidebar links are supplementary, and the redundant sidebar profile button is removed.
- Profiles show friends, favorite games, creations, and badges, in that order. Other profiles have mutual-friend counts, avatar stacks, and a mutual-friends filter.
- Settings has Account, Privacy & safety, Notifications, Game preferences, Security, and Preview data sections. Saving a section preserves the other sections.
- The notification inbox is anchored beneath the bell, with read state, preferences, outside-click dismissal, and keyboard support. It does not open a modal backdrop.
- Creator libraries include Games, Models & meshes, Audio & music, Plugins, and Cosmetics. Cosmetic slots include hats, shirts, pants, shoes, shoulders, back, neck, face, and waist.
- Creator Marketplace supports asset search, category and price filters, saves, asset details, and local listing drafts with an Alloy price. Uploads, license terms, public sales, and delivery are not connected.
- Explore ranks games from genre preferences and favorites. It provides curated shelves, genre/mood/play-style/rating filters, favorite exclusion, recommendation feedback, and a separate popular-games section.

Browser checks covered these revised pages at 320, 390, 768, and 1024 pixels as well as the normal desktop viewport. All tested routes fit without horizontal page overflow. Automated tests now include recommendation changes, hidden-game exclusion, combined discovery filters, mutual-friend intersections, asset filtering, draft normalization, and legacy game links.

## Game sessions and groups

Explore’s filter panel and featured recommendation now use the shared charcoal palette, neutral inputs, and a split artwork layout.

Game-page checks cover player-avatar hover/focus tooltips, full-server disabling, friends with joins enabled or disabled, creator links to groups and personal profiles, public/private server creation, invited players, no-charge reconfiguration, persistent demo-balance deductions, and group-owned game drafts. Browser tests confirmed creation reduced 1,450 demo Alloy to 1,350 exactly once and changing access did not charge again.

Group checks cover open membership, approval requests, cancellation, local creation, ownership, member roles, game ownership selection, and persistence after reload. Game, group, member, and Explore layouts were checked at 320, 390, 768, and 1024 pixels plus the normal desktop viewport with no horizontal page overflow.

The added automated tests cover server-creation idempotency, insufficient funds, invalid input, server access, joins-off privacy, membership transitions, creator ownership links, state migration, and invalid saved records.

Design references: [Roblox private server configuration](https://en.help.roblox.com/hc/en-us/articles/205345050-Private-VIP-Servers-FAQ) and [Roblox community management](https://en.help.roblox.com/hc/en-us/articles/203313810-How-to-Manage-a-Community). Metallic uses its own sample pricing and simplified local preview behavior.

## Scale review

All main routes, settings sections, paginated search, game details, creator categories, groups and marketplace were checked on desktop. Representative views were checked at 320, 390, 768 and 1024 pixels without horizontal overflow. Catalog pagination, filter reset, stable sorting, square profile collections, friend presence and the existing join controls remain covered.

The 10,000-game fixture validates bounded pages, filters, stable ordering and capped caches. The HTTP adapter has cancellation, timeout, retry, malformed response and oversized payload checks. A temporary production build test verifies repeatable asset versions, changed-input invalidation, CSS consolidation, immutable caching and file isolation. Build budgets and the synthetic benchmark run in CI. These checks are not a million-user backend load test. See [scaling.md](scaling.md).

The optimized production build was also exercised against a local API fixture: a failed request and manual retry, a 10,000-record total with 12 returned/rendered cards, page two, a non-sample game ID detail, and navigation away during a delayed response. The prior response did not replace the Home route. Versioned scripts, the single stylesheet and artwork loaded correctly. The fixture is ignored local QA material and is not in the published site.

An all-hidden catalog has a direct restore action and does not render empty recommendation shelves. Existing saved preferences were preserved during the review.

## Closed-beta review

The pre-change branch codex/backup-pre-closed-beta was pushed and an offline Git bundle verified before editing. Closed-beta work lives on codex/closed-beta.

The invite gate stays closed without an endpoint, on invalid/expired/malformed/rate-limited responses, and after cancellation. A local API fixture verified both the locked path and a successful short-lived verification; navigation clears access. Direct signup URLs, including invite query parameters, do not unlock signup. No real accounts or invitations were created.

Landing, login, invite access, Wardrobe, Home and profiles were checked at 320, 390, 768 and 1024 pixels without horizontal overflow. Generic icons were checked on Home, profiles, Friends, server lists, group members and people search.

The tester-only revision removes public platform navigation, game-art links and guest browsing. Direct Home, Explore, game, profile, group, download, settings and unknown routes redirect to login without rendering private-page UI. Default login is disabled because no authentication service is configured. A local session fixture verified rejection of non-beta accounts, authenticated return URLs with filters, cookie-backed restoration after reload, and logout followed by denied Home access. No live credentials or accounts were used. Six session/access tests cover default denial, membership, expiry, malformed responses, failures, cancellation, logout and internal return URLs. Static sample assets are not confidential; authoritative API authorization still belongs to the backend.
