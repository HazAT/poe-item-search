const STAT_NUMBER = "[+-]?\\d+(?:\\.\\d+)?";
// Advanced copies include the possible roll after the actual value: 62(55-64).
// Only capture the actual roll; damage-range filters average the captured values.
const STAT_VALUE = `(${STAT_NUMBER})(?:\\(${STAT_NUMBER}-${STAT_NUMBER}\\))?`;

export function addRegexToStat(stat) {
  if (!stat) return null;
  let regexPattern = stat.text
    .replaceAll("+", "\\+")
    // The trade API uses singular "Charm Slot" even for rolls above one.
    .replace(/\bCharm Slots?\b/g, "Charm Slots?")
    .replace(/\[([^\]]+)\]/g, (_, group) => {
      const options = group.split("|");
      return `(?:${options.join("|")})`;
    })
    .replaceAll("#", STAT_VALUE);

  // Check if the stat text contains '(implicit)' and set type accordingly
  let isImplicit = false;
  if (stat.text.includes("(implicit)")) {
    stat.type = "implicit";
    isImplicit = true;
  }

  // If the stat is implicit, require ' (implicit)' at the end; if explicit, forbid it
  if (stat.type === "implicit" || isImplicit) {
    // Header-based copies label each line during normalization. Legacy copies
    // can carry a single implicit label at the end of a multiline modifier.
    regexPattern = regexPattern.replace(/\r?\n/g, "(?: \\(implicit\\))?\\r?\\n");
    regexPattern += " \\(implicit\\)";
  } else {
    regexPattern = regexPattern.replace(/\r?\n/g, "\\r?\\n");
    // Desecrated modifiers still use explicit filters when searching similar items.
    if (stat.type === "explicit") {
      regexPattern += "(?: \\(desecrated\\))?";
    }
    regexPattern += "(?! \\(implicit\\))";
  }

  // Create the final regex with start/end anchors
  return {
    ...stat,
    regex: new RegExp(`^${regexPattern}$`, 'gm'),
  };
}

export function addRegexToStats(stats) {
  return {
    result: stats.result.map(category => ({
      ...category,
      entries: category.entries.map(addRegexToStat),
    })),
  };
}
