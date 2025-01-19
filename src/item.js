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
      if (entry.type !== "explicit") {
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
          
          entry.value = {};
          entry.value.min = match;
          
          // if (match) {
          //   entry.value.max = match;
          // }
          matched.push(entry);
        });
      }
    }
  }

  // Deduplicate entries based on text attribute
  const uniqueMatched = matched.filter(
    (entry, index, self) =>
      index === self.findIndex((e) => e.text === entry.text)
  );

  return uniqueMatched;
}
