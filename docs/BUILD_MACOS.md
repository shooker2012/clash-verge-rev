# Build macOS packages for this fork

The `Build macOS` workflow builds Apple Silicon (arm64) and Intel (x64) DMGs on standard GitHub-hosted macOS runners. It is manual-only and uploads build artifacts; it does not publish a Release or modify tags.

## Enable and run

1. Push `.github/workflows/build-macos.yml` to this fork. The workflow must also exist on the repository's default branch for the **Run workflow** button to appear. Either make the custom feature branch the default branch or copy this workflow to the existing default branch.
2. Open **Actions** and enable workflows if GitHub prompts you to do so.
3. Select **Build macOS**, then **Run workflow**. Select a branch containing the workflow.
4. Optionally enter a source branch, tag or commit in **Source branch, tag or commit**. Leave it empty to build the selected workflow commit. To match the initial Windows release, use `063dc680`.
5. Wait for both architecture jobs to succeed. Open the run summary and download `clash-verge-macos-arm64` and `clash-verge-macos-x64` from **Artifacts**.
6. Extract the artifact downloads if needed. Each contains a DMG, `SHA256SUMS.txt` and `BUILD-INFO.txt`. Check the source commit in the build information before attaching the DMG to a Release. Keep each architecture's checksum file with its corresponding package.

Artifacts are retained for 14 days. Download them or attach the installers to a Release before expiry. Test installation, startup, proxy operation and speed tests on a Mac before treating the packages as stable.

## Signing and updates

No Apple or Tauri signing secrets are required. The workflow uses ad-hoc signing and disables updater signature artifacts through a temporary Tauri configuration. Packages are not Apple-notarized, so macOS may require approval in Privacy & Security before opening them.

The application's update endpoints still point to upstream. Installing an official update replaces this fork's features. These packages are intended for manual installation and updates.

The workflow follows this release branch's Node.js and Rust versions, and `package.json` selects pnpm. Recheck these versions when migrating the fork to a new upstream release. `prebuild` downloads platform-specific cores and resources, some from their latest upstream releases; a source commit alone does not pin every downloaded resource.
