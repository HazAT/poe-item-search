# Codebase Concerns

**Analysis Date:** 2026-01-13

## Tech Debt

**Zoom Hack for Styles:**
- Issue: `zoom: 1.4` applied to Shadow Root container.
- Why: Host page (PoE Trade) uses `html { font-size: 10px }`, breaking Tailwind's `rem` units.
- Impact: Calculation of positions/sizes might be tricky; `zoom` is non-standard or behaves differently across browsers (though fine in Chrome).
- Location: `src/content.tsx`.

**Script Injection:**
- Issue: `script.src` injection for interceptor.
- Why: Need to run in "Main" world to monkey-patch `window.fetch`.
- Impact: Security policies (CSP) could block this in future; Fragile dependence on DOM structure.
- Location: `src/content.tsx` -> `src/injected/interceptor.ts`.

## Fragile Areas

**DOM Scraping:**
- Component: `src/injected/statIdExtractor.ts`.
- Why Fragile: Depends on internal Vue component structure of the Trade website.
- Risk: PoE Trade site update could break this feature instantly.

**Network Interception:**
- Component: `src/injected/interceptor.ts`.
- Why Fragile: Relies on specific API endpoints (`/api/trade/search/...`) and response formats.
- Risk: API changes will break history tracking.

## Dependencies at Risk

**Manifest Version:**
- Currently using Manifest V3 (Good).
- Permissions: `tabs` used in Dev mode, stripped in Prod. Ensure this logic remains robust.

## Missing Critical Features

**E2E Testing:**
- Gap: No automated browser tests seen.
- Risk: Updates to the extension could break core functionality on the live site without detection until manual testing.

## Security Considerations

**Content Script Permissions:**
- Extension has access to `pathofexile.com/trade*`.
- Interceptor accesses all network traffic on that origin.
- Ensure data handling (sanitization) in `searchInterceptor.ts` to prevent XSS if displaying search queries back to user.

---

*Concerns audit: 2026-01-13*
*Update as issues are fixed or new ones discovered*
