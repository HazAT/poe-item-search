const STAT_NUMBER = "[+-]?\\d+(?:\\.\\d+)?";
// Advanced copies include the possible roll after the actual value: 62(55-64).
// Only capture the actual roll; damage-range filters average the captured values.
const STAT_VALUE = `(${STAT_NUMBER})(?:\\(${STAT_NUMBER}-${STAT_NUMBER}\\))?`;

function escapeRegex(text) {
  return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export function addRegexToStat(stat) {
  if (!stat) return null;
  let regexPattern = stat.text
    .replace(/[ \t]*\r?\n/g, "\n")
    .split(/(\[[^\]]+\])/g)
    .map(part => part.startsWith("[")
      ? `(?:${part.slice(1, -1).split("|").map(escapeRegex).join("|")})`
      : escapeRegex(part))
    .join("")
    // The trade API uses singular "Charm Slot" even for rolls above one.
    .replace(/\bCharm Slots?\b/g, "Charm Slots?")
    // Tablet implicits similarly use singular "use" in the API template.
    .replace(/\buses? remaining\b/g, "uses? remaining")
    .replaceAll("#", STAT_VALUE);

  // Advanced copies annotate fixed modifiers; this is not part of the stat.
  regexPattern += "(?: — Unscalable Value)?";

  // Check if the stat text contains '(implicit)' and set type accordingly
  let isImplicit = false;
  if (stat.text.includes("(implicit)")) {
    stat.type = "implicit";
    isImplicit = true;
  }

  // Implicits and enchantments must keep their type: identical text can also
  // exist in the API's explicit group, where it describes a different modifier.
  if (stat.type === "implicit" || isImplicit || stat.type === "enchant") {
    const tag = stat.type;
    // Header-based copies label each line during normalization. Legacy copies
    // can carry a single label at the end of a multiline modifier.
    regexPattern = regexPattern.replace(/\r?\n/g, `(?: \\(${tag}\\))?[ \\t]*\\r?\\n`);
    regexPattern += ` \\(${tag}\\)`;
  } else {
    regexPattern = regexPattern.replace(/\r?\n/g, "[ \\t]*\\r?\\n");
    // Desecrated modifiers still use explicit filters when searching similar items.
    if (stat.type === "explicit") {
      regexPattern += "(?: \\(desecrated\\))?";
    }
    regexPattern += "(?! \\(implicit\\))";
  }

  const source = `^${regexPattern}$`;
  // The API expresses Ritual Tribute costs as increases, even for reductions.
  // Lower costs are better, so both spellings must use a maximum API value.
  const tributeCost = /\bcosts #% increased Tribute$/.test(stat.text);
  return {
    ...stat,
    regex: new RegExp(source, 'gm'),
    ...(tributeCost && {
      reducedRegex: new RegExp(source.replace("increased Tribute", "reduced Tribute"), 'gm'),
      valueBound: "max",
    }),
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
