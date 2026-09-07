# CLAUDE.md

Guidance for agents working in this repository. See [README.md](README.md) for product behavior and [docs/local-testing.md](docs/local-testing.md) for the full testing, Chrome connection, dependency, and release workflow.

## Project

Chrome extension for Path of Exile trade and trade2 pages. Players paste item text to build trade queries, track searches, save bookmarks in folders, preserve sort order, and copy items from results.

- React 19, TypeScript 6, Vite 8, Zustand 5, Tailwind 3, Storybook 10.
- Bun 1.4.2 and Node 22.13+ or 24+. Use the pinned Bun version; `npx --yes bun@1.4.2` works without replacing a global installation.
- Use normal feature branches, not worktrees; merge completed work back to main.

## Commands

```sh
bun install --frozen-lockfile
bun run check                    # ESLint, TypeScript, Bun tests
bun run storybook                # Interactive component testing on port 6006
bun run test:ui                  # Build and test every story in Chromium
bun run dev                      # Development extension in dist/
bun run package --no-prompt      # Production dist-release/ and extension.zip
bun audit
bun run update-stats
bun run generate-tiers
```

Use `bun run dev` for local development. Production builds go through `bun run package`; they must not overwrite the installed development directory. Packaging without `--no-prompt` asks for a version.

## Architecture

- `src/content.tsx` injects the page scripts and creates the panel's Shadow DOM and React root. `CollapsedToggle` renders outside that shadow root.
- `src/components/panel/` supplies the header, tabs, panel content, and dev status. `src/components/shared/SearchEntry.tsx` renders both history entries and saved searches.
- `src/components/paste/PasteInput.tsx` handles clipboard events. `src/services/itemSearch.ts` fetches stats, builds and submits queries, and validates API responses.
- `src/item.js` parses item text into filters; resistance, attribute, and damage groups use weighted filters. `src/stat.js` turns stat templates into matching expressions.
- `src/search.js` exposes query builders outside the UI.
- `src/injected/interceptor.ts` intercepts successful page searches and adds result copy controls. `src/services/searchInterceptor.ts` receives validated search data and updates history. `src/injected/statIdExtractor.ts` reads the host trade form for tier controls.
- Zustand stores live in `src/stores/`. `src/services/storage.ts` routes data to Chrome local or sync storage and handles cross-tab notifications. `src/utils/extensionApi.ts` supplies the localStorage fallback for isolated stories and tests.
- `src/services/tradeLocation.ts` parses realm, league, and search URLs for both trade API versions.

The host page sets a 10px root font size. Shadow DOM does not isolate rem units, so the panel applies `zoom: 1.4`. Tailwind CSS and the font link are injected into the shadow root. Keep this behavior when changing styles; Tailwind 4 migration is deferred for Shadow DOM compatibility.

Vite emits self-contained classic scripts and verifies that no shared chunks or imports remain. Development builds include a reload worker and `tabs` permission; production builds omit them. Rebuilding `dist/` reloads the unpacked extension and open trade tabs. Verify the version and green DEV dot on the live page.

## Verification

- Preserve failing item text exactly, including Windows line endings and modifier suffixes, in regression fixtures.
- Run `bun run check` for source changes.
- Update stories when changing components. Stories must render the actual components, with fixture data and boundary mocks; do not duplicate component implementations in display mocks.
- Test component interactions in Storybook before the installed extension. Run `bun run test:ui`; console errors fail the suite.
- Use Chrome DevTools MCP with the existing Chrome session for live browser verification. Connection instructions are in [docs/local-testing.md](docs/local-testing.md).
- Verify the submitted API query, resulting filters, and one history entry per successful pasted search. Respect the API's Retry-After interval when rate limited.
- Enable debug mode in extension settings when investigating. Retain useful debug logs.
- CI checks dependencies, source, Storybook, and both development and production builds on Windows and Linux.

## Data updates

`bun run update-stats` refreshes API stat definitions. After patches that change modifier tiers, refresh `tests/fixtures/mods.json` from [RePoE](https://repoe-fork.github.io/poe2/) and run `bun run generate-tiers` to regenerate `src/data/tiers.json`. Review generated changes before committing.
