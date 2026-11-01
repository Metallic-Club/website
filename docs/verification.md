# Website review

Reviewed November 1, 2026. The supplied Metallic reference remains the basis of the visual design. Servers is absent from the rendered UI.

## Automated verification

`npm test` covers 19 checks:

- Standalone SVG XML casing and internal paint references.
- Search, genre filtering, rating sorting, and popular sorting without catalog mutation.
- Browser-state persistence and fallback when storage is corrupt or unavailable.
- Safe rendering of user-entered content.
- Incoming and outgoing friendship transitions, including duplicate prevention.
- Normalization, size limits, and deduplication of stored records.
- Bookmarkable filters and tabs, invalid query values, and special characters in searches.
- Preview HTTP asset delivery, HEAD handling, unsupported methods, and exclusion of repository/configuration files.

The production build and JavaScript syntax checks also pass. GitHub Actions runs the tests and builds the static output on every push and pull request.

## Browser review

All requested pages, game details, community profiles, and missing-page routes were inspected. No broken images, unexpected browser errors, or Servers navigation were found.

Responsive coverage includes desktop, tablet widths of 768 and 1024 pixels, and mobile widths of 320 and 390 pixels. The requested pages fit without horizontal page overflow; shelves and category lists deliberately scroll horizontally.

Exercised in the browser:

- Search suggestions, filtered results, rapid category/sort changes, and reload persistence.
- Outfit/accessory/color changes, saved-avatar consistency, and front/back controls.
- Friend request creation, pending state, persistence, cancellation, and profile navigation.
- Creator draft creation, editing, and reload persistence.
- Mobile drawer navigation and protection of unsaved settings.
- Signup preview validation, password visibility, guest access, and recovery information.
- Play-preview and Alloy-pack dialogs, including disabled checkout.

## Integration limits

This remains a front-end foundation. Live authentication, gameplay, launcher artifacts, payments, authoritative balances, privacy enforcement, and publishing are not connected. Sample community activity and illustrative prices are labeled as preview content. Browser checks do not substitute for backend integration tests or a full assistive-technology audit.

## Requested platform revisions

- Top navigation is Home, Explore, Wardrobe, Create. Sidebar links are supplementary, and the redundant sidebar profile button is removed.
- Profiles show friends, favorite games, creations, and badges, in that order. Other profiles have mutual-friend counts, avatar stacks, and a mutual-friends filter.
- Settings has Account, Privacy & safety, Notifications, Game preferences, Security, and Preview data sections. Saving a section preserves the other sections.
- The notification inbox is anchored beneath the bell, with read state, preferences, outside-click dismissal, and keyboard support. It does not open a modal backdrop.
- Creator libraries include Games, Models & meshes, Audio & music, Plugins, and Cosmetics. Cosmetic slots include hats, shirts, pants, shoes, shoulders, back, neck, face, and waist.
- Creator Marketplace supports asset search, category and price filters, saves, asset details, and local listing drafts with an Alloy price. Uploads, license terms, public sales, and delivery are not connected.
- Explore ranks games from genre preferences and favorites. It provides curated shelves, genre/mood/play-style/rating filters, favorite exclusion, recommendation feedback, and a separate popular-games section.

Browser checks covered these revised pages at 320, 390, 768, and 1024 pixels as well as the normal desktop viewport. All tested routes fit without horizontal page overflow. Automated tests now include recommendation changes, hidden-game exclusion, combined discovery filters, mutual-friend intersections, asset filtering, draft normalization, and legacy game links.
