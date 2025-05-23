import { addRegexToStats } from "./stat.js";

export function getSearchQuery(item, stats) {
  const query = {};

  const regexStats = addRegexToStats(stats);
  const unique = matchUniqueItem(item);

  if (unique) {
    query.term = unique;
  }
  // TODO: match item class
  const matched = matchStatsOnItem(item, regexStats);

  const filters = matched.map((stat) => {
    let value;
    if (stat.value) {
      value = stat.value;
    }

    return {
      id: stat.id,
      ...(value && { value }),
    };
  });

  query.stats =
    // filters: {
    //   type_filters: {
    //     filters: {
    //       category: {
    //         option: "armour.helmet",
    //       },
    //     },
    //   },
    // },
    [
      {
        type: "and",
        filters,
      },
    ];

  return query;
}

export function matchUniqueItem(item) {
  const uniqueRegex = /Rarity: Unique\n([^\n]+)/;
  const match = item.match(uniqueRegex);

  return match ? match[1] : undefined;
}

export function matchStatsOnItem(item, stats) {
  const matched = [];
  for (const category of stats.result) {
    for (const entry of category.entries) {
      if (!entry || (entry.type !== "explicit" && entry.type !== "implicit")) {
        continue;
      }
      let m;
      while ((m = entry.regex.exec(item)) !== null) {
        // This is necessary to avoid infinite loops with zero-width matches
        if (m.index === entry.regex.lastIndex) {
          entry.regex.lastIndex++;
        }
        m.forEach((match, groupIndex) => {
          if (groupIndex === 0) {
            return;
          }
          // Create a shallow copy of entry for each match
          const matchedEntry = { ...entry, value: { min: match } };
          // Check if the stat text contains '(implicit)' and set type accordingly
          if (entry.text.includes("(implicit)")) {
            matchedEntry.type = "implicit";
          }
          matched.push(matchedEntry);
        });
      }
    }
  }
  // Deduplicate entries based on text and type attribute
  const uniqueMatched = matched.filter(
    (entry, index, self) =>
      index === self.findIndex((e) => e.text === entry.text && e.type === entry.type)
  );
  return uniqueMatched;
}
