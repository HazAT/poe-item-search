# Changelog

## 2.8.0

- Fix search-result copying failing on the trade API's new structured modifier data.
- Add a checked clipboard fallback and prevent the trade site's native copy handler from interfering.
- Copy PoE2 results in the new advanced item format, including modifier names, tiers, and roll ranges supplied by the trade API.
- Preserve modifier types and actual rolled values when copied results are pasted back into a search.
- Support Ritual Tablet modifiers, reduced Tribute costs, and amulet enhancements with fixed modifiers.
- Preserve normal item base types, normal and magic rarity, item levels, and Inscribed Ultimatum properties in searches.
- Add clipboard, advanced formatting, parser, and Storybook regression coverage.

## 2.7.1

- Support advanced copied item text with roll ranges and modifier headers, preserving actual rolled values in trade searches.
- Recognize implicit modifiers from their headers and match both singular and plural charm slots.
- Reduce unnecessary tier-filter rescans while typing in the trade site's stat autocomplete and while results update.
- Add regression coverage for advanced item copies and tier-filter updates.

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
