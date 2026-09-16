// Ported from better-trading

export const copyToClipboard = async (text: string): Promise<void> => {
  // Try the modern Clipboard API first
  if (navigator.clipboard && navigator.clipboard.writeText) {
    try {
      await navigator.clipboard.writeText(text);
      return;
    } catch {
      // Fall through to legacy method
    }
  }

  // The panel lives in a shadow root, so remember the actual focused control.
  let activeElement = document.activeElement;
  while (activeElement?.shadowRoot?.activeElement) {
    activeElement = activeElement.shadowRoot.activeElement;
  }
  const focusedElement = activeElement instanceof HTMLElement ? activeElement : null;
  const focusedInput = activeElement instanceof HTMLInputElement || activeElement instanceof HTMLTextAreaElement
    ? activeElement
    : null;
  const inputSelection = focusedInput && focusedInput.selectionStart !== null && focusedInput.selectionEnd !== null
    ? { start: focusedInput.selectionStart, end: focusedInput.selectionEnd, direction: focusedInput.selectionDirection }
    : null;
  const selection = document.getSelection();
  const ranges = selection
    ? Array.from({ length: selection.rangeCount }, (_, index) => selection.getRangeAt(index).cloneRange())
    : [];

  // Legacy fallback using execCommand. Its boolean result is the only signal
  // that the browser actually accepted the copy operation.
  const dummyTextarea = document.createElement("textarea");
  dummyTextarea.value = text;
  dummyTextarea.readOnly = true;
  dummyTextarea.tabIndex = -1;
  dummyTextarea.style.position = "fixed";
  dummyTextarea.style.left = "-9999px";
  dummyTextarea.style.opacity = "0";

  try {
    document.body.appendChild(dummyTextarea);
    dummyTextarea.focus({ preventScroll: true });
    dummyTextarea.select();
    dummyTextarea.setSelectionRange(0, text.length);

    if (typeof document.execCommand !== "function" || !document.execCommand("copy")) {
      throw new Error("Copy failed: the browser denied clipboard access.");
    }
  } finally {
    dummyTextarea.remove();
    focusedElement?.focus({ preventScroll: true });
    if (selection) {
      selection.removeAllRanges();
      for (const range of ranges) selection.addRange(range);
    }
    if (focusedInput && inputSelection) {
      focusedInput.setSelectionRange(inputSelection.start, inputSelection.end, inputSelection.direction ?? undefined);
    }
  }
};
