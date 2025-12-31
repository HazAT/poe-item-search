import { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { FolderIcon, PlusIcon, CheckIcon } from "@/components/ui";
import type { BookmarksFolderStruct } from "@/types/bookmarks";

export interface FolderPickerDropdownProps {
  folders: BookmarksFolderStruct[];
  anchorRef: React.RefObject<HTMLButtonElement | null>;
  onSelect: (folderId: string) => void;
  onCreateFolder: (title: string) => Promise<string>;
  onClose: () => void;
}

export function FolderPickerDropdown({
  folders,
  anchorRef,
  onSelect,
  onCreateFolder,
  onClose,
}: FolderPickerDropdownProps) {
  const [isCreating, setIsCreating] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [position, setPosition] = useState({ top: 0, left: 0 });
  const dropdownRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Calculate fixed position based on anchor element's viewport position
  useEffect(() => {
    if (anchorRef.current) {
      const rect = anchorRef.current.getBoundingClientRect();
      // Use fixed positioning with viewport coordinates
      // Position dropdown to the left of the button, below it
      setPosition({
        top: rect.bottom + 4,
        left: Math.max(8, rect.right - 192), // 192px = dropdown width, keep 8px from edge
      });
    }
  }, [anchorRef]);

  // Filter out archived folders
  const activeFolders = folders.filter((f) => !f.archivedAt);

  // Close on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        onClose();
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [onClose]);

  // Focus input when creating
  useEffect(() => {
    if (isCreating && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isCreating]);

  const handleSelectFolder = (folderId: string) => {
    onSelect(folderId);
    onClose();
  };

  const handleCreateFolder = async () => {
    if (!newFolderName.trim() || isSubmitting) return;

    setIsSubmitting(true);
    try {
      const folderId = await onCreateFolder(newFolderName.trim());
      onSelect(folderId);
      onClose();
    } catch (error) {
      console.error("Failed to create folder:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleCreateFolder();
    } else if (e.key === "Escape") {
      if (isCreating) {
        setIsCreating(false);
        setNewFolderName("");
      } else {
        onClose();
      }
    }
  };

  // Inline styles for rendering outside shadow DOM (Tailwind won't work)
  const styles = {
    dropdown: {
      position: "fixed" as const,
      top: position.top,
      left: position.left,
      width: "192px",
      backgroundColor: "#1a1a1d",
      border: "1px solid #3d3d3d",
      borderRadius: "4px",
      boxShadow: "0 4px 12px rgba(0,0,0,0.5)",
      zIndex: 99999,
      fontFamily: "system-ui, sans-serif",
      fontSize: "14px",
    },
    folderList: {
      padding: "4px 0",
      maxHeight: "192px",
      overflowY: "auto" as const,
    },
    folderButton: {
      width: "100%",
      display: "flex",
      alignItems: "center",
      gap: "8px",
      padding: "6px 12px",
      textAlign: "left" as const,
      color: "#c8b68b",
      backgroundColor: "transparent",
      border: "none",
      cursor: "pointer",
    },
    folderButtonHover: {
      backgroundColor: "#2a2a2e",
    },
    folderIcon: {
      width: "16px",
      height: "16px",
      color: "#af8930",
      flexShrink: 0,
    },
    separator: {
      borderTop: "1px solid #3d3d3d",
    },
    newFolderButton: {
      width: "100%",
      display: "flex",
      alignItems: "center",
      gap: "8px",
      padding: "8px 12px",
      textAlign: "left" as const,
      color: "#8b8b8b",
      backgroundColor: "transparent",
      border: "none",
      cursor: "pointer",
    },
    inputRow: {
      display: "flex",
      alignItems: "center",
      gap: "4px",
      padding: "8px",
    },
    input: {
      flex: 1,
      backgroundColor: "#2a2a2e",
      color: "#c8b68b",
      fontSize: "14px",
      padding: "4px 8px",
      borderRadius: "4px",
      border: "1px solid #3d3d3d",
      outline: "none",
    },
    submitButton: {
      padding: "4px",
      color: "#af8930",
      backgroundColor: "transparent",
      border: "none",
      cursor: "pointer",
    },
    emptyText: {
      padding: "8px 12px",
      fontSize: "12px",
      color: "#8b8b8b",
    },
  };

  const dropdown = (
    <div
      ref={dropdownRef}
      style={styles.dropdown}
      onClick={(e) => e.stopPropagation()}
    >
      <div style={styles.folderList}>
        {activeFolders.length === 0 && !isCreating && (
          <div style={styles.emptyText}>No folders yet</div>
        )}
        {activeFolders.map((folder) => (
          <button
            key={folder.id}
            style={styles.folderButton}
            onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "#2a2a2e")}
            onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "transparent")}
            onClick={() => handleSelectFolder(folder.id!)}
          >
            <FolderIcon style={styles.folderIcon} />
            <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {folder.title}
            </span>
          </button>
        ))}
      </div>

      <div style={styles.separator}>
        {isCreating ? (
          <div style={styles.inputRow}>
            <input
              ref={inputRef}
              type="text"
              value={newFolderName}
              onChange={(e) => setNewFolderName(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Folder name..."
              style={styles.input}
              disabled={isSubmitting}
            />
            <button
              onClick={handleCreateFolder}
              disabled={!newFolderName.trim() || isSubmitting}
              style={{
                ...styles.submitButton,
                opacity: !newFolderName.trim() || isSubmitting ? 0.5 : 1,
              }}
              title="Create folder"
            >
              <CheckIcon style={{ width: "16px", height: "16px" }} />
            </button>
          </div>
        ) : (
          <button
            style={styles.newFolderButton}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = "#2a2a2e";
              e.currentTarget.style.color = "#c8b68b";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = "transparent";
              e.currentTarget.style.color = "#8b8b8b";
            }}
            onClick={() => setIsCreating(true)}
          >
            <PlusIcon style={{ width: "16px", height: "16px", flexShrink: 0 }} />
            <span>New Folder</span>
          </button>
        )}
      </div>
    </div>
  );

  // Render to document.body to escape shadow DOM
  return createPortal(dropdown, document.body);
}
