/**
 * Converts PoE2 trade items to advanced copied text, adding modifier details
 * when the API provides them. PoE1 items retain their plain copied format.
 */

import type { TradeItem, TradeItemExtendedMod, TradeItemMod, TradeItemModMagnitude, TradeItemModType, TradeItemProperty, TradeItemRequirement } from "@/types/tradeItem";

const SEPARATOR = "--------";

/**
 * Strip bracket notation from mod text.
 * API returns mods like: "71% increased [Armour|Armour], [Evasion|Evasion]"
 * Game format shows: "71% increased Armour, Evasion"
 * Pattern: [Key|Display] → Display
 */
function stripBracketNotation(text: string): string {
  return text.replace(/\[([^\]|]+)\|([^\]]+)\]/g, "$2").replace(/\[([^\]]+)\]/g, "$1");
}

/**
 * Format a property value with augmented indicator.
 * values[0][1] === 1 means the value is augmented (modified by quality/mods)
 */
function formatPropertyValue(prop: TradeItemProperty): string {
  if (!prop.values || prop.values.length === 0) {
    return "";
  }

  const parts: string[] = [];
  for (const [value, augmented] of prop.values) {
    if (augmented === 1) {
      parts.push(`${value} (augmented)`);
    } else {
      parts.push(value);
    }
  }
  return parts.join(", ");
}

/**
 * Format properties section.
 * Includes: Quality, Armour, Evasion, Energy Shield, Physical Damage, etc.
 */
function formatProperties(properties: TradeItemProperty[]): string[] {
  const lines: string[] = [];

  for (const prop of properties) {
    const name = stripBracketNotation(prop.name);
    const value = formatPropertyValue(prop);

    // Properties with no value are category headers (e.g., "Body Armour")
    if (!value) {
      continue;
    }

    lines.push(`${name}: ${value}`);
  }

  return lines;
}

/**
 * Format requirements section.
 * Can be single line: "Requires: Level 65, 54 Str, 54 Dex"
 * Or multi-line with "Requirements:" header
 */
function formatRequirements(requirements: TradeItemRequirement[]): string[] {
  if (!requirements || requirements.length === 0) {
    return [];
  }

  const parts: string[] = [];

  for (const req of requirements) {
    const name = stripBracketNotation(req.name);
    const value = req.values?.[0]?.[0] || "";
    parts.push(`${name}: ${value}`);
  }

  // Use single-line format: "Requires: Level 65, 54 Str, 54 Dex"
  // or multi-line if complex
  if (parts.length <= 4) {
    // Format as single line for common case
    const formatted = parts.map((p) => {
      // "Level: 65" → "Level 65", "Str: 54" → "54 Str"
      const [name, val] = p.split(": ");
      if (name === "Level") {
        return `Level ${val}`;
      }
      return `${val} ${name}`;
    });
    return [`Requires: ${formatted.join(", ")}`];
  }

  // Multi-line format
  return ["Requirements:", ...parts];
}

/**
 * Format sockets section.
 * API: [{ group: 0 }, { group: 0 }, { group: 1 }]
 * Game: "Sockets: S S S" (space separated)
 */
function formatSockets(sockets: TradeItem["sockets"]): string | null {
  if (!sockets || sockets.length === 0) {
    return null;
  }

  // Each socket is represented as "S"
  const socketStr = sockets.map(() => "S").join(" ");
  return `Sockets: ${socketStr}`;
}

/**
 * Get the item class from the first property (which is typically the category).
 * e.g., "Body Armour", "Wands", "Rings"
 */
function getItemClass(properties: TradeItemProperty[] | undefined): string | null {
  if (!properties || properties.length === 0) {
    return null;
  }

  // First property with empty values is usually the item class
  const classProperty = properties.find((p) => !p.values || p.values.length === 0);
  if (classProperty) {
    const name = stripBracketNotation(classProperty.name);
    const irregularPlurals: Record<string, string> = {
      Staff: "Staves",
      Quarterstaff: "Quarterstaves",
      Focus: "Foci",
      Foci: "Foci",
    };
    return irregularPlurals[name] ?? (name.endsWith("s") ? name : `${name}s`);
  }

  return null;
}

/**
 * Format mods with their suffix type.
 */
function formatMod(mod: string, suffix?: string): string {
  const cleanMod = stripBracketNotation(mod);
  return suffix ? `${cleanMod} (${suffix})` : cleanMod;
}

function modifierText(mod: TradeItemMod): string {
  return typeof mod === "string" ? mod : mod.description;
}

function modifierType(mod: TradeItemMod, fallback: TradeItemModType): TradeItemModType {
  if (typeof mod === "string") return fallback;
  // Some responses keep special modifiers in explicitMods and mark their kind
  // on the entry itself, rather than using a separate desecratedMods array.
  for (const flag of ["desecrated", "fractured", "crafted", "mutated"] as const) {
    if (mod.flags?.[flag]) return flag;
  }
  return mod.domain ?? fallback;
}

function modifierHeader(type: TradeItemModType, mod?: TradeItemExtendedMod): string {
  if (type === "enchant") return "{ Enhancement }";
  const tier = typeof mod?.tier === "string" ? mod.tier.match(/^([PS])?(\d+)$/) : null;
  const affix = tier?.[1] === "P" ? "Prefix" : tier?.[1] === "S" ? "Suffix" : undefined;
  const kind = type === "explicit"
    ? affix ?? "Explicit"
    : `${type[0].toUpperCase()}${type.slice(1)}${affix && type !== "implicit" ? ` ${affix}` : ""}`;
  const name = mod?.name ? ` "${mod.name}"` : "";
  const tierText = tier ? ` (Tier: ${tier[2]})` : "";
  return `{ ${kind} Modifier${name}${tierText} }`;
}

/** Only annotate numbers when the API identifies every magnitude unambiguously. */
function addRollBounds(text: string, magnitudes: TradeItemModMagnitude[]): string {
  const rolls = [...text.matchAll(/[+-]?\d+(?:\.\d+)?/g)];
  if (!rolls.length || rolls.length !== magnitudes.length) return text;

  const bounds = magnitudes.map((magnitude, index) => {
    let min = Number(magnitude.min);
    let max = Number(magnitude.max);
    const value = Number(rolls[index][0]);
    if (!Number.isFinite(min) || !Number.isFinite(max)) return null;
    // Negative API increases are displayed as positive reductions in item text.
    if (value > 0 && min <= 0 && max <= 0 && /\b(?:reduced|less)\b/.test(text)) {
      min = -min;
      max = -max;
    }
    if (value < Math.min(min, max) || value > Math.max(min, max)) return null;
    return min === max ? "" : `(${min}-${max})`;
  });
  if (bounds.some(bound => bound === null)) return text;
  let index = 0;
  return text.replace(/[+-]?\d+(?:\.\d+)?/g, value => `${value}${bounds[index++]}`);
}

function formatAdvancedMods(item: TradeItem, sectionType: TradeItemModType, entries: TradeItemMod[]): string[] {
  const metadata = item.extended?.mods?.[sectionType];
  const hashes = item.extended?.hashes?.[sectionType];
  const groups = new Map<TradeItemExtendedMod | string, { header: string; lines: string[] }>();
  for (const [index, entry] of entries.entries()) {
    const text = modifierText(entry);
    const type = modifierType(entry, sectionType);
    if (type === "rune") {
      groups.set(`rune-${index}`, {
        header: "",
        lines: text.split(/\r?\n/).map(line => `## ${formatMod(line, type)}`),
      });
      continue;
    }
    // Never assume that displayed stat order matches the modifier metadata order.
    const mapping = hashes?.length === entries.length ? hashes[index] : undefined;
    const indices = mapping?.[1];
    const structured = typeof entry !== "string";
    const mod = structured
      ? entry.mods?.length === 1 ? entry.mods[0] : undefined
      : indices?.length === 1 ? metadata?.[indices[0]] : undefined;
    const key = mod ?? `unmapped-${index}`;
    let group = groups.get(key);
    if (!group) {
      group = { header: modifierHeader(type, mod), lines: [] };
      groups.set(key, group);
    }
    const cleanText = stripBracketNotation(text);
    const magnitudes = structured
      ? mod?.magnitudes ?? []
      : mod?.magnitudes?.filter(magnitude => magnitude.hash === mapping?.[0]) ?? [];
    group.lines.push(addRollBounds(cleanText, magnitudes));
  }
  return [...groups.values()].flatMap(group => group.header ? [group.header, ...group.lines] : group.lines);
}

/**
 * Convert a TradeItem from the API to the game's raw text format.
 */
export function formatItemText(item: TradeItem, { format = item.realm === "poe2" ? "advanced" : "plain" }: { format?: "advanced" | "plain" } = {}): string {
  const lines: string[] = [];
  const advanced = format === "advanced";
  const propertyLine = (line: string) => advanced ? `## ${line}` : line;

  // Item Class
  const itemClass = getItemClass(item.properties);
  if (itemClass) {
    lines.push(`Item Class: ${itemClass}`);
  }

  // Rarity
  lines.push(`Rarity: ${item.rarity}`);

  // Name (for rare/unique items)
  if (item.name && (item.rarity === "Rare" || item.rarity === "Unique")) {
    lines.push(item.name);
  }

  // Type line (base type)
  lines.push(item.typeLine);

  // Properties (Quality, Armour, etc.)
  if (item.properties && item.properties.length > 0) {
    const propLines = formatProperties(item.properties);
    if (propLines.length > 0) {
      lines.push(SEPARATOR);
      lines.push(...propLines.map(propertyLine));
    }
  }

  // Requirements
  if (item.requirements && item.requirements.length > 0) {
    lines.push(SEPARATOR);
    lines.push(...formatRequirements(item.requirements).map(propertyLine));
  }

  // Sockets
  const socketsLine = formatSockets(item.sockets);
  if (socketsLine) {
    lines.push(SEPARATOR);
    lines.push(propertyLine(socketsLine));
  }

  // Item Level
  lines.push(SEPARATOR);
  lines.push(propertyLine(`Item Level: ${item.ilvl}`));

  const modSections: [TradeItemMod[] | undefined, TradeItemModType][] = [
    [item.runeMods, "rune"],
    [item.enchantMods, "enchant"],
    [item.implicitMods, "implicit"],
    [item.fracturedMods, "fractured"],
    [item.explicitMods, "explicit"],
    [item.desecratedMods, "desecrated"],
    [item.mutatedMods, "mutated"],
    [item.craftedMods, "crafted"],
  ];
  for (const [mods, type] of modSections) {
    if (mods?.length) {
      lines.push(SEPARATOR, ...(advanced
        ? formatAdvancedMods(item, type, mods)
        : mods.map(mod => {
          const kind = modifierType(mod, type);
          return formatMod(modifierText(mod), kind === "explicit" ? undefined : kind);
        })));
    }
  }

  // Corrupted
  if (item.corrupted) {
    lines.push(SEPARATOR);
    lines.push("Corrupted");
  }

  // Flavour text (for uniques)
  if (item.flavourText && item.flavourText.length > 0) {
    lines.push(SEPARATOR);
    for (const text of item.flavourText) {
      lines.push(text);
    }
  }

  // Note (price)
  if (item.note) {
    lines.push(SEPARATOR);
    lines.push(`Note: ${item.note}`);
  }

  return lines.join("\n");
}
