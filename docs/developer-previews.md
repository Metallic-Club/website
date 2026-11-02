# Browser previews

Open these links directly. No installation, Codespace, or GitHub sign-in is needed.

| Version | Preview | What to expect |
| --- | --- | --- |
| Beta access | [Open beta preview](https://metallic-club.github.io/website/beta/index.html#/) | Current closed-beta landing, login and invite screens. Platform pages remain locked because no live authentication service is configured. |
| Early release | [Open early-release preview](https://metallic-club.github.io/website/early-release/index.html#/home) | The browsable pre-beta version, including Home, Explore, profiles, creator pages, and sample interactions. |

The [preview selection page](https://metallic-club.github.io/website/) links to both versions. These are public design previews with sample content. They do not create accounts, run live games, or process purchases. The private ChatGPT-hosted Site is separate.

## Publishing updates

The GitHub Pages workflow builds `main` as the beta preview and `codex/early-release-preview` as the early-release preview, then publishes them together. Pushes to either branch trigger the workflow. For beta updates, merge `codex/closed-beta` into `main`. The original backup branch remains unchanged.

The two builds live under separate directories, so relative artwork, scripts and styles resolve for each version. The preview builder clears live API configuration for both builds. Generated output contains only the selection page and built static assets, not repository metadata or local configuration.

To build the combined output locally from the beta/main checkout, with an early-release checkout available:

```sh
node scripts/build-previews.mjs --early /path/to/early-release-checkout
```

The output is `.local/github-pages/`. The workflow uploads that directory to GitHub Pages. Pages is configured for GitHub Actions in the repository settings.

## Work on the source

Developers who want an editor and their own running copy can still use [Beta Codespaces](https://codespaces.new/Metallic-Club/website/tree/codex/closed-beta?quickstart=1) or [Early-release Codespaces](https://codespaces.new/Metallic-Club/website/tree/codex/early-release-preview?quickstart=1). Those are development environments, not the hosted preview links above.

For a local checkout, use Node.js 22+ and run `npm run dev`, then open http://127.0.0.1:4173. Each version has its own branch and can be checked out separately.
