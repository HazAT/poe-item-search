import { addRegexToStats } from "./stat.js";

export function matchStats(item, stats) {
  const regexStats = addRegexToStats(stats);
  const matched = matchStatsOnItem(item, regexStats);
  return matched;
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
