# Local development and browser testing

## Build and load the extension

Use Bun 1.4.2 and Node.js 22.13+ or Node.js 24+. The repository's `packageManager` field and CI pin Bun 1.4.2; CI uses Node 22 LTS.

```sh
bun install --frozen-lockfile
bun run dev
```

The commands in this guide assume the pinned Bun version is on your PATH. To use it without changing an older global installation, replace `bun` with `npx --yes bun@1.4.2`, for example `npx --yes bun@1.4.2 run check`.

`bun run dev` performs one build into `dist/`. Run it again after code changes. It includes the background worker that detects changed bundles and reloads the extension and open PoE trade tabs. An identical rebuild does not trigger a reload.

1. Open `chrome://extensions` in the Chrome profile you use for PoE trade.
2. Disable the Chrome Web Store copy of **Path of Exile 2 - Trading Buddy** while testing. Keep it installed so you can switch back later.
3. Enable **Developer mode**, click **Load unpacked**, and select this repository's **dist** directory.
4. Reload the unpacked extension once, then refresh a PoE trade tab.
5. Open the extension panel and check that **DEV** has a green dot. Its tooltip should say **Dev reload active**.

The local source version may differ from the store release. The DEV indicator identifies a development build, and its green dot confirms the background worker responds. Verify the changed behavior as well to confirm that the intended code revision is loaded.

## Connect an agent to your existing Chrome

Follow the [Chrome DevTools configuration guide](https://developer.chrome.com/docs/devtools/agents/get-started/configuration). Existing-session connections require Chrome 144 or newer. The `npx` commands below require Node.js LTS and npm installed.

1. Open `chrome://inspect/#remote-debugging` and enable **Allow remote debugging for this browser instance**.
2. Configure the official `chrome-devtools-mcp` server with `--autoConnect` in your agent client.
3. Allow the connection when Chrome prompts. This gives the connected agent control of the existing browser session, including signed-in tabs.

For Codex on Windows, the following entry in `%USERPROFILE%\.codex\config.toml` uses the existing browser and disables optional usage statistics and CrUX lookups:

```toml
[mcp_servers.chrome-devtools]
command = "cmd"
args = ["/c", "npx", "-y", "chrome-devtools-mcp@latest", "--autoConnect", "--no-usage-statistics", "--no-performance-crux"]
startup_timeout_sec = 30

[mcp_servers.chrome-devtools.env]
SystemRoot = "C:\\Windows"
PROGRAMFILES = "C:\\Program Files"
```

Reload the client's MCP connection or restart the client if the tools do not appear. The package also provides a CLI for checking the connection from an existing session:

```sh
npx --yes --package=chrome-devtools-mcp@latest chrome-devtools start --autoConnect --no-categoryExtensions --no-usage-statistics --no-performance-crux
npx --yes --package=chrome-devtools-mcp@latest chrome-devtools list_pages
```

The CLI's extension-management category is disabled here because those tools require a pipe connection; use Chrome's extension manager to install the unpacked build in an existing profile.

Use the page ID returned by `list_pages` when inspecting a trade tab:

```sh
npx --yes --package=chrome-devtools-mcp@latest chrome-devtools take_snapshot <pageId>
npx --yes --package=chrome-devtools-mcp@latest chrome-devtools list_console_messages <pageId>
npx --yes --package=chrome-devtools-mcp@latest chrome-devtools list_network_requests <pageId>
```

## Verify an item-paste fix

1. Preserve the exact failing clipboard text, including line endings and modifier suffixes, in a regression fixture.
2. Run `bun run check` for ESLint, TypeScript, and the Bun regression suite.
3. For component changes, update stories that render the actual components and add interaction assertions for the changed behavior. Inspect them with `bun run storybook`, then run `bun run test:ui` before testing the extension.
4. Run `bun run dev` and confirm the page reloads with the green DEV indicator.
5. In the extension settings, enable debug logging for the investigation.
6. Paste the fixture into **Paste Item**. This should trigger a search automatically.
7. Inspect the POST to `/api/trade2/search/...` or `/api/trade/search/...`, including its query body and response. Confirm the destination search shows the expected item type/name and stat filters.
8. Check that the search appears once in history and that the console has no extension errors.

The parser builds API queries; it does not populate the trade form by clicking its controls. Compare the submitted query with the resulting form when filters are missing or incorrect.

Rebuilding reloads all open trade tabs, which can trigger several API searches. If the API returns HTTP 429, wait for the `Retry-After` interval before retrying the paste. A successful query may legitimately return zero listings; verify its filters separately from its result count.

## Automated checks

`bun run lint` checks JavaScript, TypeScript, and React Hooks with zero warnings allowed. `bun run lint:fix` applies available automatic fixes. `bun run check` also runs TypeScript and the Bun tests.

Install the Chromium browser used by the UI runner once after installing dependencies:

```sh
bun x playwright install chromium
```

For each UI change, update the actual component's stories and run:

```sh
bun run check
bun run test:ui
bun run dev
```

`test:ui` builds Storybook, serves it on `127.0.0.1:6007`, runs every story in headless Chromium, and stops the server when tests finish or fail. Stories without a `play` function receive a render smoke test; stories with one also run their interaction assertions. Console errors fail the run. Storybook uses a separate Vite configuration so its build cannot modify the installed development extension in `dist/`.

For faster iterations against an existing `bun run storybook` server on port 6006, run `bun run test-storybook`. You can append a story filename to select a subset, for example `bun run test-storybook PasteInput`.

Storybook renders the production components. Fixtures, API responses, and isolated storage are set up in stories; behavior assertions live in their `play` functions. PasteInput's rate-limit and base64 stories use fixture responses and never call the live trade API. Sentry is disabled only in the Storybook Vite configuration.

Storybook 10.6 uses `storybook/test` for interaction helpers and `@storybook/react-vite` for story types. Controls, actions, and interactions are built into Storybook; `@storybook/addon-docs` supplies documentation. Keep the framework, docs addon, and `storybook` versions aligned. The Chromium runner uses the Storybook 10-compatible `@storybook/test-runner` 0.24 series. See the [Storybook migration guide](https://storybook.js.org/docs/releases/migration-guide) and [test-runner compatibility table](https://storybook.js.org/addons/%40storybook/test-runner).

GitHub Actions runs `bun audit` and `check`, installs Chromium, runs the same `test:ui` command, and builds both development and production packages on Windows and Linux for pull requests and pushes to `main`. After automated checks pass, verify the affected behavior in the installed Chrome extension with its green DEV indicator.

## Package a release

Update the version in `package.json`, refresh `bun.lock` with `bun install`, and complete the checks and live browser verification above. Run `bun run package` and accept the current version at the prompt, or run `bun run package --no-prompt` to use it automatically. It builds the production extension into `dist-release/` and creates `extension.zip` with `manifest.json` at the archive root. The installed development build in `dist/` stays intact.

Production packages omit the dev reload worker, its `tabs` permission, and the DEV indicator. Upload `extension.zip` as a new package in the Chrome Web Store developer dashboard, confirm the displayed version, and submit it for review.

## Dependency compatibility

- TypeScript stays on the 6.0 patch line (`~6.0.3`) because typescript-eslint 8.69 supports TypeScript below 6.1. Recheck its [supported dependency versions](https://typescript-eslint.io/users/dependency-versions/) before upgrading.
- Tailwind stays on the latest 3.x release, 3.4.19. Version 4's `@property` registrations do not work inside shadow roots; moving them into the host page would change this extension's style isolation. Track the [Tailwind Shadow DOM issue](https://github.com/tailwindlabs/tailwindcss/issues/15005) before migrating.
- `@types/node` stays on major 22 to match the Node version exercised by CI.
- The temporary `uuid` override selects patched 11.1.1 for the test runner's older dependencies while retaining their CommonJS API. Remove it when the test runner's dependency chain selects a patched version itself, then rerun `bun audit`, `bun run check`, and `bun run test:ui`.
