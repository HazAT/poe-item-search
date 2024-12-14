export function addRegexToStat(stat) {
  if (stat.text.match(/\(implicit\)/) && stat.type !== "implicit") {
    return null;
  }
  let regexPattern = stat.text
    .replaceAll("+", "\\+")
    .replaceAll("#", "(?:\\+|-)?(\\d+(?:.\\d+)?)?")
    .replace(/\[([^\]]+)\]/g, (_, group) => {
      const options = group.split("|");
      return `(?:${options.join("|")})`;
    });

  // Create the final regex with start/end anchors
  return {
    ...stat,
    regex: new RegExp(`${regexPattern}`),
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
