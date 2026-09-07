export function addRegexToStat(stat) {
  if (!stat) return null;
  let regexPattern = stat.text
    .replaceAll("+", "\\+")
    .replace(/\[([^\]]+)\]/g, (_, group) => {
      const options = group.split("|");
      return `(?:${options.join("|")})`;
    })
    .replaceAll("#", "([+-]?\\d+(?:\\.\\d+)?)");

  // Check if the stat text contains '(implicit)' and set type accordingly
  let isImplicit = false;
  if (stat.text.includes("(implicit)")) {
    stat.type = "implicit";
    isImplicit = true;
  }

  // If the stat is implicit, require ' (implicit)' at the end; if explicit, forbid it
  if (stat.type === "implicit" || isImplicit) {
    regexPattern += " \\(implicit\\)";
  } else {
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
