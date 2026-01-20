# Testing Patterns

**Analysis Date:** 2026-01-13

## Test Framework

**Runner:**
- **Bun Test**: Used for unit and integration tests.
- Config: Implicit or part of `bun.lock` / `package.json`.

**Assertion Library:**
- `expect` from `bun:test` (Jest-compatible).
- Matchers: `toBe`, `toEqual`, `toHaveProperty`, `rejects.toThrow`.

**Run Commands:**
```bash
bun test             # Run all tests
bun test --watch     # Watch mode (assumed supported by Bun)
```

## Test File Organization

**Location:**
- Co-located or root-level src tests: `src/*.test.js` (e.g., `src/search.test.js`).
- Scripts tests: `scripts/*.test.js`.

**Naming:**
- `*.test.js` suffix.

## Test Structure

**Suite Organization:**
```javascript
import { expect, test, describe } from "bun:test";

describe("ModuleName", () => {
  test("description", async () => {
    // arrange
    // act
    // assert
  });
});
```

**Patterns:**
- Async/Await used extensively.
- `beforeAll` / `beforeEach` supported (though not seen in sample).

## Mocking

**Framework:**
- Bun's built-in mocking capabilities (if needed).
- Sample `src/search.test.js` uses real fixtures, no heavy mocking seen for logic tests.

## Fixtures

**Location:**
- `tests/fixtures/`: Contains raw text files (`.txt`) and JSON data (`stats.json`).
- Loading: `await Bun.file("tests/fixtures/file.txt").text()`.

## Component Testing

**Storybook:**
- Used for UI component development and visual testing.
- Stories located in `stories/`.
- Run: `bun run storybook`.

## Test Types

**Unit Tests:**
- Focus: Logic functions (`buildSearchQuery`, `item.js` regexes).
- Files: `src/search.test.js`, `src/item.test.js`, `src/stat.test.js`.

**Integration Tests:**
- Focus: Interaction between parser and search builder.

**E2E Tests:**
- Not explicitly configured in `package.json` (no Playwright/Cypress seen).

---

*Testing analysis: 2026-01-13*
*Update when test patterns change*
