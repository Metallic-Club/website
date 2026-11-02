# Creator library and group controls

The creator workflow uses assets and templates. The retired project and listing record workflows are no longer loaded or rendered.

- Categories: Games, Templates, Models & meshes, Textures & materials, Audio & music, Plugins, Cosmetics.
- Every asset has a hash-addressable detail page, description, tags, ratings, and preview inventory action.
- Four default templates include downloadable example scene specifications. Custom templates remain device-local and are never uploaded.
- File and folder pickers and folder-aware drag-and-drop use the same validation. Limits: 100 files, 50 MB per file, 100 MB per asset, 100 local assets. Executables, HTML, and SVG uploads are rejected; imported scripts are never executed.
- File blobs live in IndexedDB, separately from bounded localStorage metadata. An import reports success only after both stores have saved. Local images and audio can be previewed. Object URLs are revoked when leaving or rerendering a page. Reset clears local files as well as metadata.
- Marketplace illustrations and ratings are sample content. Inventory actions do not charge Alloy or deliver a purchased file. Online uploads, licensing, sales, and live inventory are not connected.

Group management has overview, profile, announcements, members, and roles sections. Profile edits include a square image, name, description, interest, and join policy. Role permissions separately control profile editing, announcements, member-role assignment, role editing, and game creation.

Owner rank is protected. Other editors can only affect lower ranks, cannot change their own role, and cannot grant permissions they do not hold. The preview supports adding a simulated member from the local friends list to exercise role assignment. This does not invite or affect real accounts. Live services must enforce these rules independently using authenticated membership; browser state is not an authorization boundary.

Validation includes module syntax checks, persistence normalization, file validation, directory traversal limits, rating transitions, protected ownership, role escalation prevention, and asset-art resolution. Browser QA exercised local import/download/reload, group image/name persistence, custom role creation/assignment, tooltip alignment, and theme styling.
