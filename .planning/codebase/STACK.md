# Technology Stack

**Analysis Date:** 2026-01-13

## Languages

**Primary:**
- TypeScript 5.7 - All application code and configuration
- JavaScript - Build scripts (`scripts/`), legacy content scripts

**Secondary:**
- CSS - `src/index.css` (Tailwind directives)

## Runtime

**Environment:**
- Browser (Chrome Extension environment)
- Node.js (Build scripts)
- Bun (Local development and scripts)

**Package Manager:**
- Bun 1.x
- Lockfile: `bun.lock` present

## Frameworks

**Core:**
- React 18.3 - UI framework
- Zustand 5.0 - State management

**Testing:**
- Bun Test - Unit and integration testing
- Storybook 8.4 - Component development

**Build/Dev:**
- Vite 6.0 - Bundling and development server
- Tailwind CSS 3.4 - Utility-first styling
- CRXJS Vite Plugin - Chrome Extension build integration

## Key Dependencies

**Critical:**
- `lz-string` - String compression (likely for storage or URL encoding)
- `@sentry/browser` - Error tracking
- `webextension-polyfill` - Cross-browser extension API support (via `web-ext` or implicitly)

**Infrastructure:**
- `vite-plugin-web-extension` - Extension build tooling
- `vite-plugin-terminal` - Terminal output in browser console

## Configuration

**Environment:**
- `vite.config.ts` - Main build configuration
- `tsconfig.json` - TypeScript configuration
- `tailwind.config.ts` - Tailwind configuration
- `postcss.config.js` - PostCSS configuration

**Build:**
- `scripts/package.js` - Packaging script for distribution
- `scripts/fetch-stats.js` - Data fetching script

## Platform Requirements

**Development:**
- Bun runtime
- Node.js (compatible with Vite/Tailwind)

**Production:**
- Chrome-based browser (Arc, Chrome, Brave, Edge)
- Path of Exile Trade website (target host)

---

*Stack analysis: 2026-01-13*
*Update after major dependency changes*
