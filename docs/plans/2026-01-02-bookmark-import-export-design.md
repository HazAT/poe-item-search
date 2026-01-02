# Bookmark Folder Import/Export Design

## Overview

Add ability to export individual bookmark folders as LZ-compressed strings and import them back. Enables sharing bookmark folders between users or backing them up manually.

## Data Format

```typescript
interface FolderExport {
  folder: {
    title: string;
    version: TradeSiteVersion;
    icon: string | null;
  };
  trades: BookmarksTradeStruct[];
}
```

- Uses `LZString.compressToEncodedURIComponent()` (already in syncService)
- On import: generates new IDs for folder and all trades (no ID conflicts)
- `archivedAt` not exported (imported folders start unarchived)
- `updatedAt` set fresh on import

## Export Functionality

**Location:** Export icon button in `BookmarkFolder` hover actions (alongside Edit/Archive/Delete)

**Flow:**
1. User hovers folder → sees Export icon
2. User clicks Export → folder + trades compressed → copied to clipboard
3. Brief visual feedback (button state change)

**Implementation:**
- Add `ExportIcon` to UI components
- Add `exportFolder(folderId: string)` to bookmarksStore:
  - Gets folder from state
  - Gets trades for that folder
  - Builds `FolderExport` object
  - Compresses with `LZString.compressToEncodedURIComponent()`
  - Copies to clipboard via `navigator.clipboard.writeText()`

## Import Functionality

**Location:** "Import" button next to "New Folder" in BookmarksTab header

**Flow:**
1. User clicks "Import" → Modal opens with textarea
2. User pastes LZ-string → clicks "Import" button
3. System decompresses, validates, creates folder with new IDs
4. Modal closes, new folder appears in list

**Implementation:**
- Add `importFolder(compressed: string)` to bookmarksStore:
  - Decompresses with `LZString.decompressFromEncodedURIComponent()`
  - Validates structure has `folder` and `trades` properties
  - Creates folder with `createFolder()` (gets new ID)
  - Creates each trade with `createTrade()` (gets new IDs)
- New state in BookmarksTab: `isImportModalOpen`
- Modal with textarea input and Import/Cancel buttons
- Error handling: if decompress fails or invalid structure, show error in modal

## Files to Modify

1. `src/components/ui/Icons.tsx` - Add ExportIcon, ImportIcon
2. `src/stores/bookmarksStore.ts` - Add `exportFolder()`, `importFolder()`
3. `src/components/bookmarks/BookmarksTab.tsx` - Add export button to folder hover, add import button + modal

## UI Details

**Export Button (in BookmarkFolder hover actions):**
```tsx
<Button
  variant="ghost"
  size="sm"
  onClick={(e) => {
    e.stopPropagation();
    exportFolder(folder.id!);
  }}
  title="Export"
>
  <ExportIcon className="w-4 h-4" />
</Button>
```

**Import Button (in header):**
```tsx
<Button
  variant="default"
  size="sm"
  onClick={() => setIsImportModalOpen(true)}
>
  <ImportIcon className="w-4 h-4 mr-1" />
  Import
</Button>
```

**Import Modal:** Same pattern as Create Folder modal - textarea instead of input, Import/Cancel buttons.
