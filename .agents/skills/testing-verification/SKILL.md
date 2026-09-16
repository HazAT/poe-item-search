---
name: testing-verification
description: Use when testing UI changes, verifying builds work, or validating extension behavior on PoE trade website or Storybook
---

# Testing & Verification Workflow

This skill guides testing and verification for this Chrome extension project using Playwriter MCP.

## Pre-flight Checklist

Before testing, ensure:
1. [ ] Dev build is running or production build is available
2. [ ] Playwriter MCP connection is established
3. [ ] Target page (PoE trade or Storybook) is connected

## Step 1: Establish Playwriter Connection

### Check Available Pages

```javascript
const pages = context.pages();
console.log('Available pages:', pages.length);
pages.forEach((p, i) => console.log(`  ${i}: ${p.url()}`));
```

### Connection Troubleshooting

**If no pages or connection errors:**
1. Call `mcp__playwriter__reset` to reset the CDP connection
2. Re-check available pages

**If PoE trade page still not showing after reset:**
- Prompt user: "Please click the Playwriter extension icon on the PoE trade tab you want to control"

**If Storybook not connected:**
- Prompt user: "Please click the Playwriter extension icon on your Storybook tab (localhost:6006)"

### Find Specific Pages

```javascript
// Find PoE trade page
const tradePage = context.pages().find(p => p.url().includes('pathofexile.com/trade'));
if (tradePage) state.tradePage = tradePage;

// Find Storybook page
const storybookPage = context.pages().find(p => p.url().includes('localhost:6006'));
if (storybookPage) state.storybookPage = storybookPage;
```

## Step 2: Build and Reload

### Trigger Dev Build

Run in terminal (not Playwriter):
```bash
bun run dev
```

This builds with dev mode enabled and auto-reload capability. The extension will auto-reload when it detects the new build (polling every 1 second).

### Verify Build Loaded

After build completes, wait a moment for auto-reload, then verify the extension is present:

```javascript
// Check if extension overlay panel exists
const snapshot = await accessibilitySnapshot({ page: state.tradePage, search: /DEV|poe|search/i });
console.log(snapshot);
```

## Step 3: Verify Dev Mode Connection

The DEV indicator in the panel header shows reload status:
- **Green dot**: Background reload script is connected and working
- **Red dot**: Disconnected - extension needs reload or background script issue
- **Yellow dot**: Checking connection status

### Check DEV Indicator

```javascript
// Look for DEV indicator in panel header
const snapshot = await accessibilitySnapshot({ page: state.tradePage, search: /DEV/i });
console.log(snapshot);
```

The indicator should show "DEV" text with a colored dot. If you see the DEV indicator but it's red:
1. Try refreshing the trade page manually
2. Check chrome://extensions for errors
3. Reload the extension in chrome://extensions

### Verify Auto-Reload Works

1. Make a small code change (e.g., add a console.log)
2. Run `bun run dev` again
3. Watch the trade page - it should auto-reload within 1-2 seconds
4. Verify the DEV indicator is still green after reload

## Step 4: Test UI Components

### Testing in Storybook (Preferred for Component Development)

Start Storybook if not running:
```bash
bun run storybook
```

Navigate to specific stories:
```javascript
// Navigate to a component story
await state.storybookPage.goto('http://localhost:6006/?path=/story/panel--default');
await state.storybookPage.waitForLoadState('networkidle');
const snapshot = await accessibilitySnapshot({ page: state.storybookPage });
console.log(snapshot);
```

### Testing on PoE Trade Website

Check the extension panel is visible:
```javascript
// Get snapshot of extension elements
const snapshot = await accessibilitySnapshot({ page: state.tradePage, search: /paste|history|bookmark/i });
console.log(snapshot);
```

Interact with panel tabs:
```javascript
// Click a tab in the extension panel
await state.tradePage.locator('aria-ref=<ref>').click();
await accessibilitySnapshot({ page: state.tradePage, showDiffSinceLastCall: true });
```

## Step 5: Test Item Paste Functionality

### Paste an Item

```javascript
const itemText = `Item Class: Body Armours
Rarity: Rare
Damnation Shell
Expert Hexer's Robe
--------
Energy Shield: 135
--------
Requirements:
Level: 65
Int: 134
--------
Item Level: 74
--------
+35 to maximum Life
+42% to Fire Resistance
+28% to Lightning Resistance`;

const pasteInput = state.tradePage.locator('input[placeholder*="Paste"]');
await pasteInput.click();
await pasteInput.evaluate((el, text) => {
  el.value = '';
  const event = new ClipboardEvent('paste', {
    clipboardData: new DataTransfer(),
    bubbles: true
  });
  event.clipboardData.setData('text/plain', text);
  el.dispatchEvent(event);
}, itemText);
```

### Verify Search Triggered

After pasting, check that:
1. Stat filters populated in the search form
2. History entry added to extension panel

```javascript
// Check stat filters appeared
const statsSnapshot = await accessibilitySnapshot({ page: state.tradePage, search: /stat filter|resistance|life/i });
console.log(statsSnapshot);

// Check history tab
await state.tradePage.locator('button:has-text("History")').click();
const historySnapshot = await accessibilitySnapshot({ page: state.tradePage, search: /history/i });
console.log(historySnapshot);
```

## Common Issues & Solutions

### Extension Not Visible
- Check if you're on a PoE trade page (`pathofexile.com/trade` or `trade2`)
- Verify extension is enabled in chrome://extensions
- Try refreshing the page

### DEV Indicator Red/Missing
- Run `bun run dev` to ensure dev build is loaded
- Production builds don't have the DEV indicator
- Check chrome://extensions for extension errors
- Reload the extension

### Playwriter Not Connecting
1. Call `mcp__playwriter__reset`
2. User clicks Playwriter extension icon on target tab
3. Try again

### Storybook Styles Look Wrong
- Storybook runs outside Shadow DOM context
- Some styles may differ from in-extension appearance
- Test critical styling on actual trade page

### Auto-Reload Not Working
- Check DEV indicator shows green
- Verify `bun run dev` completed without errors
- Check background script logs in chrome://extensions > service worker

## Verification Checklist

After changes, verify:
- [ ] `bun run dev` completes without errors
- [ ] Trade page auto-reloads after build
- [ ] DEV indicator shows green dot
- [ ] Changed components render correctly
- [ ] Item paste triggers search (if applicable)
- [ ] No console errors in browser DevTools
- [ ] Storybook stories still work (if component changed)

## Quick Reference

| Task | Command/Action |
|------|----------------|
| Dev build | `bun run dev` |
| Production build | `bun run build` |
| Start Storybook | `bun run storybook` |
| Run tests | `bun test` |
| Reset Playwriter | `mcp__playwriter__reset` |
| Check extension | Accessibility snapshot for DEV indicator |
| Find trade page | `context.pages().find(p => p.url().includes('pathofexile.com/trade'))` |
