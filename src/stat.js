export function addRegexToStat(stat) {
  if (!stat) return null;
  let regexPattern = stat.text
    .replaceAll("+", "\\+")
    .replaceAll("#", "(?:\\+|-)?(\\d+(?:.\\d+)?)?")
    .replace(/\[([^\]]+)\]/g, (_, group) => {
      const options = group.split("|");
      return `(?:${options.join("|")})`;
    });

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
    regexPattern += "(?! \\(implicit\\))";
  }

  // Create the final regex with start/end anchors
  return {
    ...stat,
    regex: new RegExp(`^${regexPattern}$`, 'gm'),
  };
}

export function addRegexToStats(stats) {
  // add regex to all entries and return new stats
  const newEntries = [];
  stats.result.map((category) => {
    newEntries.push({
      ...category,
      entries: category.entries.map((entry) => {
        return addRegexToStat(entry);
      }),
    });
  });
  return { result: newEntries };
}
