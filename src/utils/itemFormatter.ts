/**
 * Converts PoE Trade API item JSON to game's raw text format.
 * This format matches what you get when copying an item in-game (Ctrl+C).
 */

import type {
  TradeItem,
  TradeItemProperty,
  TradeItemRequirement,
} from "@/types/tradeItem";

const SEPARATOR = "--------";

/**
 * Strip bracket notation from mod text.
 * API returns mods like: "71% increased [Armour|Armour], [Evasion|Evasion]"
 * Game format shows: "71% increased Armour, Evasion"
 * Pattern: [Key|Display] → Display
 */
function stripBracketNotation(text: string): string {
  return text
    .replace(/\[([^\]|]+)\|([^\]]+)\]/g, "$2")
    .replace(/\[([^\]]+)\]/g, "$1");
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

  // Single-line format for common case
  if (parts.length <= 4) {
    const formatted = parts.map((p) => {
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

  const socketStr = sockets.map(() => "S").join(" ");
  return `Sockets: ${socketStr}`;
}

/**
 * Get the item class from the first property (which is typically the category).
 * e.g., "Body Armour", "Wands", "Rings"
 */
function getItemClass(
  properties: TradeItemProperty[] | undefined
): string | null {
  if (!properties || properties.length === 0) {
    return null;
  }

  // First property with empty values is usually the item class
  const classProperty = properties.find(
    (p) => !p.values || p.values.length === 0
  );
  if (classProperty) {
    return stripBracketNotation(classProperty.name);
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

/**
 * Convert a TradeItem from the API to the game's raw text format.
 */
export function formatItemText(item: TradeItem): string {
  const lines: string[] = [];

  // Item Class
  const itemClass = getItemClass(item.properties);
  if (itemClass) {
    // Add 's' for plural (Body Armour → Body Armours, Ring → Rings)
    lines.push(`Item Class: ${itemClass}s`);
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
      lines.push(...propLines);
    }
  }

  // Requirements
  if (item.requirements && item.requirements.length > 0) {
    lines.push(SEPARATOR);
    lines.push(...formatRequirements(item.requirements));
  }

  // Sockets
  const socketsLine = formatSockets(item.sockets);
  if (socketsLine) {
    lines.push(SEPARATOR);
    lines.push(socketsLine);
  }

  // Item Level
  lines.push(SEPARATOR);
  lines.push(`Item Level: ${item.ilvl}`);

  // Rune mods (if any)
  if (item.runeMods && item.runeMods.length > 0) {
    lines.push(SEPARATOR);
    for (const mod of item.runeMods) {
      lines.push(formatMod(mod, "rune"));
    }
  }

  // Enchant mods (if any)
  if (item.enchantMods && item.enchantMods.length > 0) {
    lines.push(SEPARATOR);
    for (const mod of item.enchantMods) {
      lines.push(formatMod(mod, "enchant"));
    }
  }

  // Implicit mods
  if (item.implicitMods && item.implicitMods.length > 0) {
    lines.push(SEPARATOR);
    for (const mod of item.implicitMods) {
      lines.push(formatMod(mod, "implicit"));
    }
  }

  // Explicit + fractured + desecrated mods juntos (como no jogo)
  const explicitBlock: string[] = [];

  if (item.fracturedMods && item.fracturedMods.length > 0) {
    for (const mod of item.fracturedMods) {
      explicitBlock.push(formatMod(mod, "fractured"));
    }
  }

  if (item.explicitMods && item.explicitMods.length > 0) {
    for (const mod of item.explicitMods) {
      explicitBlock.push(formatMod(mod));
    }
  }

  if (item.desecratedMods && item.desecratedMods.length > 0) {
    for (const mod of item.desecratedMods) {
      explicitBlock.push(formatMod(mod, "desecrated"));
    }
  }

  if (explicitBlock.length > 0) {
    lines.push(SEPARATOR);
    lines.push(...explicitBlock);
  }

  // Crafted mods (ficam em bloco separado, se existirem)
  if (item.craftedMods && item.craftedMods.length > 0) {
    lines.push(SEPARATOR);
    for (const mod of item.craftedMods) {
      lines.push(formatMod(mod, "crafted"));
    }
  }

  // Fractured Item flag (linha extra, como no jogo)
  if (item.fractured) {
    lines.push(SEPARATOR);
    lines.push("Fractured Item");
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
