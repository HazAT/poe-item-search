export function addRegexToStat(stat) {
  if (!stat) return null;

  let regexPattern = stat.text
    .replaceAll("+", "\\+")
    .replaceAll("#", "(?:\\+|-)?(\\d+(?:.\\d+)?)?")
    .replace(/\[([^\]]+)\]/g, (_, group) => {
      const options = group.split("|");
      return `(?:${options.join("|")})`;
    });

  let isImplicit = false;
  let isFractured = false;
  let isDesecrated = false;

  if (stat.text.includes("(implicit)")) {
    stat.type = "implicit";
    isImplicit = true;
  } else if (stat.text.includes("(fractured)")) {
    stat.type = "fractured";
    isFractured = true;
  } else if (stat.text.includes("(desecrated)")) {
    stat.type = "desecrated";
    isDesecrated = true;
  }

  if (stat.type === "implicit" || isImplicit) {
    regexPattern += " \\(implicit\\)";
  } else if (stat.type === "fractured" || isFractured) {
    regexPattern += " \\(fractured\\)";
  } else if (stat.type === "desecrated" || isDesecrated) {
    regexPattern += " \\(desecrated\\)";
  } else {
    regexPattern += "(?! \\(implicit\\))(?! \\(fractured\\))(?! \\(desecrated\\))";
  }

  return {
    ...stat,
    regex: new RegExp(`^${regexPattern}$`, "gm"),
  };
}

export function addRegexToStats(stats) {
  const newEntries = [];
  stats.result.map((category) => {
    newEntries.push({
      ...category,
      entries: category.entries.map((entry) => addRegexToStat(entry)),
    });
  });
  return { result: newEntries };
}
