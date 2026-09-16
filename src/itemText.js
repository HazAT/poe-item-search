const INLINE_MODIFIER_TAG = / \((?:implicit|explicit|desecrated|rune|crafted|fractured|mutated|enchant)\)\s*$/;

function getHeaderType(header) {
  if (header.trim() === "Enhancement") return "enchant";
  const kind = header.match(/^\s*(.*?)\s+Modifier(?:\s|$)/)?.[1];
  if (kind === "Implicit") return "implicit";
  if (["Prefix", "Suffix", "Explicit", "Desecrated", "Desecrated Prefix", "Desecrated Suffix"].includes(kind)) {
    return "explicit";
  }
  return "excluded";
}

/**
 * Convert advanced-copy modifier headers to the inline tags used by stat matching.
 * Unsupported headers stay excluded rather than becoming ordinary explicit mods.
 * Preserve line endings and legacy text so this only affects header-based copies.
 */
export function normalizeItemText(item) {
  let modifierType = null;
  return item.split(/(\r\n|\n|\r)/).map((line, index) => {
    if (index % 2 === 1) return line;

    if (/^\s*$/.test(line) || /^\s*-{3,}\s*$/.test(line)) {
      modifierType = null;
      return line;
    }

    const header = line.match(/^\s*\{(.*)\}\s*$/);
    if (header) {
      modifierType = getHeaderType(header[1]);
      return line;
    }

    if (modifierType === "excluded") return "";
    if (!["implicit", "enchant"].includes(modifierType) || INLINE_MODIFIER_TAG.test(line)) return line;

    // Tag every line: one modifier can contain several stats or a multiline stat.
    return `${line.trimEnd()} (${modifierType})`;
  }).join("");
}
