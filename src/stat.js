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
  let isRune = false;
  let isAugment = false;

  if (stat.text.includes("(implicit)")) {
    stat.type = "implicit";
    isImplicit = true;
  } else if (stat.text.includes("(fractured)")) {
    stat.type = "fractured";
    isFractured = true;
  } else if (stat.text.includes("(desecrated)")) {
    stat.type = "desecrated";
    isDesecrated = true;
  } else if (stat.text.includes("(rune)") || stat.text.includes("(augment)")) { 
    stat.type = "augment"; 
    isAugment = true;
  }

  if (stat.type === "implicit" || isImplicit) {
    regexPattern += " \\(implicit\\)";
  } else if (stat.type === "fractured" || isFractured) {
    regexPattern += " \\(fractured\\)";
  } else if (stat.type === "desecrated" || isDesecrated) {
    regexPattern += " \\(desecrated\\)";
  } else if (stat.type === "augment" || isAugment) {
    regexPattern += " \\((?:rune|augment)\\)"; 
  } else {
    regexPattern += "(?! \\(implicit\\))(?! \\(fractured\\))(?! \\(desecrated\\))(?! \\(augment\\))(?! \\(rune\\))";
  }


  return {
    ...stat,
    regex: new RegExp(`^${regexPattern}$`, "gm"),
  };
}0

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
