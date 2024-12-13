import { addRegexToStats } from "./stat.js";

export function getSearchQuery(item, stats) {
  const query = {};

  const regexStats = addRegexToStats(stats);
  const unique = matchUnique(item);
  if (unique) {
    query.term = unique;
  } else {
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
  }

  return query;
}

export function matchUnique(item) {
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
      const match = item.match(entry.regex);
      if (match) {
        entry.value = {};
        if (match[1]) {
          entry.value.min = match[1];
        }
        if (match[2]) {
          entry.value.max = match[2];
        }
        matched.push(entry);
      }
    }
  }
  return matched;
}
