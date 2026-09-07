# Local development and browser testing

## Build and load the extension

```sh
bun install
bun run dev
```

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
2. Run `bun test` and `bun run typecheck`.
3. For component changes, update the corresponding Storybook stories and test them with `bun run storybook` before testing the extension.
4. Run `bun run dev` and confirm the page reloads with the green DEV indicator.
5. In the extension settings, enable debug logging for the investigation.
6. Paste the fixture into **Paste Item**. This should trigger a search automatically.
7. Inspect the POST to `/api/trade2/search/...` or `/api/trade/search/...`, including its query body and response. Confirm the destination search shows the expected item type/name and stat filters.
8. Check that the search appears once in history and that the console has no extension errors.

The parser builds API queries; it does not populate the trade form by clicking its controls. Compare the submitted query with the resulting form when filters are missing or incorrect.

Rebuilding reloads all open trade tabs, which can trigger several API searches. If the API returns HTTP 429, wait for the `Retry-After` interval before retrying the paste. A successful query may legitimately return zero listings; verify its filters separately from its result count.
