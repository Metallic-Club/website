# Developer browser previews

These links open GitHub Codespaces on the selected version. Each developer runs their own preview; the links do not use the private ChatGPT-hosted Site.

| Version | Open in browser | What to expect |
| --- | --- | --- |
| Beta access | [Run the beta preview](https://codespaces.new/Metallic-Club/website/tree/codex/closed-beta?quickstart=1) | Current closed-beta landing, invitation flow, generic player icons and Wardrobe placeholder. Platform pages require a verified tester session; with no backend configured they remain locked. |
| Early release | [Run the early-release preview](https://codespaces.new/Metallic-Club/website/tree/codex/early-release-preview?quickstart=1) | The browsable version from before the closed-beta changes, based on commit f41a0ff. Home, Explore, profiles, creator tools and the other sample pages can be reviewed without live authentication. |

## Start a preview

1. Sign in to GitHub and open the link for the version you want.
2. Choose **Create codespace**, or resume an existing codespace for that branch. Codespaces must be available for your GitHub account or organization.
3. Wait for the container to start. The repository starts the preview server and forwards port **4173**.
4. If the site does not open automatically, select the **Ports** tab and click **Open in Browser** for port 4173.

Keep the forwarded port private for your own development preview. Each developer should use their own Codespaces link rather than another developer's temporary forwarded address. Codespaces follows the account's or organization's usage allowance and billing settings; stop it when finished.

Edits are served directly from the checked-out source. Refresh the browser after editing. If you stop the server, run `npm run dev` in the terminal. New commits are not pulled into an existing codespace automatically; commit or stash your own changes before pulling updates. Create a new codespace from the same link if you want a fresh checkout.

## Run on your own computer

With Node.js 22+ and Git installed:

```sh
git clone --branch codex/closed-beta https://github.com/Metallic-Club/website.git metallic-beta
cd metallic-beta
npm run dev
```

For the early-release version, use `--branch codex/early-release-preview` and a separate folder such as `metallic-early-release`. Open http://127.0.0.1:4173 after the server starts. Stop one preview before starting the other on the same computer.

## Version and data boundaries

The early-release branch is a separate copy of the original version with developer-preview setup added. The backup branch `codex/backup-pre-closed-beta` remains unchanged. Neither preview is a released platform: games, players, Alloy and other activity are sample data. No live games, purchases or accounts are provisioned. The beta branch retains its access checks; Codespaces does not authenticate someone as a Metallic beta tester.

The repository's dev container follows GitHub's [Codespaces link format](https://docs.github.com/en/codespaces/setting-up-your-project-for-codespaces/setting-up-your-repository/facilitating-quick-creation-and-resumption-of-codespaces) and [automatic application preview setup](https://docs.github.com/en/codespaces/setting-up-your-project-for-codespaces/setting-up-your-repository/setting-up-a-template-repository-for-github-codespaces).
