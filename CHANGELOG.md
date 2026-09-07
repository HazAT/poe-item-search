# Changelog

## 2.7.0

- Fix pasted Windows item text losing unique item names and desecrated modifiers in trade searches.
- Preserve signed and decimal modifier values and report failed or rate-limited searches clearly.
- Prevent saved bookmarks from being overwritten when adding a trade to an unopened folder.
- Recognize the trade site's compressed search URLs when bookmarking a pasted search.
- Improve storage synchronization, search history validation, and item preview selection.
- Improve keyboard navigation and separate entry actions from search buttons.
- Simplify item parsing and remove obsolete UI and build code.
- Upgrade React, Vite, Storybook, Sentry, and other dependencies; add linting and automated browser checks on Windows and Linux.
- Package releases separately from the installed development extension.
