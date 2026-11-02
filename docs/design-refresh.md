# Orange design and creator documentation

The visual refresh uses an orange accent by default, the original Metallic mark, clearer text, stronger active states, more compact Home spacing, and a mobile header that keeps discovery within reach. Fourteen original SVG concept illustrations give the sample games distinct subjects. They are not screenshots or a representation of a released game. The generator lives in scripts/generate-concept-art.mjs.

Themes are under Settings → Themes. Dark, light and system appearance, five accent palettes, standard/large text, and stronger contrast are stored independently under metallic-appearance-v1. Invalid saved values use safe defaults. System appearance follows device changes, and other tabs can pick up saved changes. Light themes use darker accent text while keeping action buttons neutral. Gameplay actions use green across all themes. Existing neutral colors are adapted through theme-palette.css; new component styles use semantic theme variables.

The Creator hub offers Obby, Open world and Social hangout starting points. Default templates have detail pages with example scene downloads. Custom templates can be imported from files or folders and remain on the device; no project-record workflow is used. Guides and API links are available beside these starting points.

Documentation uses hash routes under #/docs. Eleven articles cover getting started, a first project, scripting basics, collectibles, checkpoints, an interactive door, Instance/Part, Vector3/Color3, signals, players, and server/client concepts. Articles have chapter navigation, reading guides, code copying, syntax highlighting and search. Engine-specific APIs are explicitly proposed examples. The website does not run Luau or provide an SDK. Standard language examples reference the official Luau syntax and type documentation.

The beta access checks, generic profile pictures and Wardrobe placeholder remain in the beta branch. The browsable preview keeps its existing prototype behavior so reviewers can inspect all pages. Both versions receive the shared design, themes, documentation and concept art.

## Backups

- codex/backup-pre-orange-design preserves the beta at c3d7bc2ffeb699dc62a5e63e0327dafae4e0c47d.
- codex/backup-early-pre-orange preserves the browsable preview at 3aca16e14e502c48fed3787f65a64ec335c51651.
- S:/Projects/Active/Metallic-Website-Backups/pre-orange-design.bundle includes both refs and complete history. Git verified the bundle before editing.

## Verification

The automated suite adds checks for appearance normalization, independent persistence, system-theme resolution, unique documentation destinations, bounded search, HTML/code escaping and explicit proposed-API labeling. Existing catalog, social, access and build checks are retained.

Browser review covers Home, Explore, Creator hub, Themes, documentation home, an API article, game detail and profile at 320, 390, 768, 1024 and 1440 pixels. No horizontal page overflow was found after responsive fixes. Large text and stronger contrast were checked at 390 pixels. The review exercised persistence after reload, accent and mode changes, reset, template preselection, documentation search, code copying and the beta docs route redirecting to login. Sitewide theme changes do not authenticate a user or create a real account.

The JavaScript budget remains 120 KiB gzip. The combined CSS budget is 48 KiB gzip to include the light-theme palette and documentation layouts. Current outputs remain content-versioned with one stylesheet and no runtime UI dependencies.
