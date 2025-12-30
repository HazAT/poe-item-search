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

  // Legacy fallback using execCommand
  const dummyTextarea = document.createElement("textarea");
  dummyTextarea.value = text;
  dummyTextarea.style.position = "fixed";
  dummyTextarea.style.left = "-9999px";
  dummyTextarea.style.opacity = "0";

  document.body.appendChild(dummyTextarea);

  dummyTextarea.select();
  dummyTextarea.setSelectionRange(0, text.length);

  document.execCommand("copy");

  dummyTextarea.remove();
};
