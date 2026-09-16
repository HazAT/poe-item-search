import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, userEvent, waitFor } from "storybook/test";
import { wireCopyButtons } from "../src/injected/itemCopy";
import type { TradeItem } from "../src/types/tradeItem";

type ClipboardMode = "modern" | "fallback" | "denied";

const item: TradeItem = {
  id: "first-item", realm: "poe2", verified: true, w: 1, h: 3,
  icon: "", league: "Standard", name: "Doom Song", typeLine: "Crystal Wand",
  baseType: "Crystal Wand", rarity: "Rare", frameType: 2, ilvl: 80, identified: true,
  properties: [{ name: "Wand", values: [], displayMode: 0 }],
  explicitMods: ["+50 to maximum Mana"],
  extended: {
    mods: { explicit: [{
      name: "Sage's", tier: "P3", level: 40,
      magnitudes: [{ hash: "explicit.mana", min: "40", max: "59" }],
    }] },
    hashes: { explicit: [["explicit.mana", [0]]] },
  },
};

const expectedText = [
  "Item Class: Wands", "Rarity: Rare", "Doom Song", "Crystal Wand",
  "--------", "## Item Level: 80", "--------",
  '{ Prefix Modifier "Sage\'s" (Tier: 3) }', "+50(40-59) to maximum Mana",
].join("\n");

// The live API now embeds each description and its metadata in an object.
// In particular, desecrated modifiers can appear in the explicitMods array.
const structuredItem: TradeItem = {
  ...item,
  extended: undefined,
  implicitMods: [{
    description: "20% increased [Spell|Spell] Damage", domain: "implicit",
    hash: "stat.implicit.stat_2974417149",
    mods: [{ magnitudes: [{ min: "10", max: "30" }] }],
  }],
  explicitMods: [{
    description: "+50 to maximum Mana", domain: "explicit", hash: "stat.explicit.stat_1050105434",
    mods: [{ name: "Sage's", tier: "P3", level: 1, magnitudes: [{ min: "40", max: "59" }] }],
  }, {
    description: "+12 to Intelligence", domain: "desecrated", hash: "stat.desecrated.stat_328541901",
    mods: [{ name: "of the Void", tier: "S2", level: 1, magnitudes: [{ min: "10", max: "15" }] }],
  }],
};

function setupFixture(mode: ClipboardMode, structured: boolean) {
  const fixtureItem = structured ? structuredItem : item;
  const section = document.createElement("section");
  section.style.cssText = "max-width:660px;margin:32px auto;padding:24px;background:#151515;color:#eee;font:14px sans-serif";
  const results = document.createElement("div");
  results.className = "resultset";
  const row = document.createElement("div");
  row.className = "row";
  row.dataset.id = item.id;
  const name = document.createElement("h2");
  name.textContent = `${item.name} — ${item.typeLine}`;
  const button = document.createElement("button");
  button.className = "copy hidden";
  button.textContent = "Copy item";
  button.style.cssText = "padding:8px 12px;background:#786331;color:white;border:1px solid #aa924f;cursor:pointer";
  const status = document.createElement("p");
  status.setAttribute("role", "status");
  status.textContent = "Checking item copy…";
  const preview = document.createElement("pre");
  preview.setAttribute("aria-label", "Copied item text");
  preview.style.cssText = "padding:16px;background:#080808;white-space:pre-wrap;color:#c7b285";
  preview.textContent = "No clipboard write yet.";
  row.append(name, button);
  results.append(row);
  section.append(results, status, preview);
  document.body.append(section);

  const state = {
    modernCalls: [] as string[], legacyCalls: [] as string[], nativeCalls: 0,
    copiedText: "", messages: [] as { itemText: string; itemId: string }[], errors: [] as string[],
  };
  // Simulate the site's handler being registered before our extension loads.
  button.addEventListener("click", () => { state.nativeCalls++; });
  const clipboardDescriptor = Object.getOwnPropertyDescriptor(navigator, "clipboard");
  const execDescriptor = Object.getOwnPropertyDescriptor(document, "execCommand");
  const showCopiedText = (text: string) => {
    state.copiedText = text;
    preview.textContent = text;
  };
  Object.defineProperty(navigator, "clipboard", { configurable: true, value: {
    writeText: async (text: string) => {
      state.modernCalls.push(text);
      if (mode !== "modern") throw new DOMException("Clipboard access denied", "NotAllowedError");
      showCopiedText(text);
    },
  } });
  Object.defineProperty(document, "execCommand", { configurable: true, value: (command: string) => {
    state.legacyCalls.push(command);
    if (mode === "denied") return false;
    const textarea = document.activeElement;
    if (!(textarea instanceof HTMLTextAreaElement)) return false;
    showCopiedText(textarea.value.slice(textarea.selectionStart, textarea.selectionEnd));
    return true;
  } });
  const onMessage = (event: MessageEvent) => {
    if (event.source === window && event.data?.type === "poe-search-item-copied") {
      state.messages.push(event.data.payload);
    }
  };
  window.addEventListener("message", onMessage);
  const cache = new Map([[fixtureItem.id, fixtureItem], ["second-item", { ...fixtureItem, id: "second-item", name: "Storm Song" }]]);
  const logger = {
    log: () => {}, warn: () => {}, error: (message: string) => { state.errors.push(message); },
  };
  wireCopyButtons(cache, logger);

  return {
    button, row, state,
    pass(message: string) {
      status.textContent = `PASS: ${message}`;
      status.style.color = "#a5d75a";
    },
    cleanup() {
      if (clipboardDescriptor) Object.defineProperty(navigator, "clipboard", clipboardDescriptor);
      else Reflect.deleteProperty(navigator, "clipboard");
      if (execDescriptor) Object.defineProperty(document, "execCommand", execDescriptor);
      else Reflect.deleteProperty(document, "execCommand");
      window.removeEventListener("message", onMessage);
      section.remove();
      document.querySelectorAll("[data-poe-copy-tooltip]").forEach(tooltip => tooltip.remove());
    },
  };
}

let fixture: ReturnType<typeof setupFixture>;

const meta = {
  title: "Integration/ItemCopy",
  parameters: { layout: "centered" },
  beforeEach: ({ parameters }) => {
    const currentFixture = setupFixture(parameters.clipboardMode ?? "modern", parameters.structuredModifiers === true);
    fixture = currentFixture;
    return () => currentFixture.cleanup();
  },
  render: () => <p className="text-poe-beige">Real search-result copy handler with simulated browser clipboard permissions</p>,
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

async function expectSuccess(text = expectedText, itemId = item.id) {
  await waitFor(() => expect(fixture.state.messages).toHaveLength(1));
  await expect(fixture.state.copiedText).toBe(text);
  await expect(fixture.state.messages[0]).toMatchObject({ itemText: text, itemId });
  await expect(fixture.state.errors).toHaveLength(0);
  await expect(document.querySelector("[data-poe-copy-tooltip]")).toHaveTextContent("Copied!");
}

export const ModernClipboard: Story = {
  play: async () => {
    await userEvent.click(fixture.button);
    await expectSuccess();
    await expect(fixture.state.modernCalls).toEqual([expectedText]);
    await expect(fixture.state.legacyCalls).toHaveLength(0);
    fixture.pass("Modern clipboard copied the advanced item format with modifier tiers and roll ranges.");
  },
};

export const DeniedClipboardUsesFallback: Story = {
  parameters: { clipboardMode: "fallback" },
  play: async () => {
    await userEvent.click(fixture.button);
    await expectSuccess();
    await expect(fixture.state.modernCalls).toEqual([expectedText]);
    await expect(fixture.state.legacyCalls).toEqual(["copy"]);
    await expect(fixture.button).toHaveFocus();
    await expect(document.querySelectorAll("textarea")).toHaveLength(0);
    fixture.pass("Denied modern clipboard used the fallback, copied advanced text, and restored focus.");
  },
};

export const BothMethodsFail: Story = {
  parameters: { clipboardMode: "denied" },
  play: async () => {
    await userEvent.click(fixture.button);
    await waitFor(() => expect(fixture.state.errors).toHaveLength(1));
    await expect(document.querySelector("[data-poe-copy-tooltip]")).toHaveTextContent("Copy failed");
    await expect(fixture.state.legacyCalls).toEqual(["copy"]);
    await expect(fixture.state.copiedText).toBe("");
    await expect(fixture.state.messages).toHaveLength(0);
    await expect(document.querySelectorAll("textarea")).toHaveLength(0);
    fixture.pass("Both clipboard methods failed honestly; no copied-item success event was emitted.");
  },
};

export const ReusedResultRow: Story = {
  play: async () => {
    fixture.row.dataset.id = "second-item";
    await userEvent.click(fixture.button);
    await expectSuccess(expectedText.replace("Doom Song", "Storm Song"), "second-item");
    fixture.pass("A reused result row copied the current listing, including its advanced modifiers.");
  },
};

export const BlocksExistingNativeHandler: Story = {
  play: async () => {
    await userEvent.click(fixture.button);
    await expectSuccess();
    await expect(fixture.state.nativeCalls).toBe(0);
    fixture.pass("The extension copied once and blocked the site's previously registered copy handler.");
  },
};

export const StructuredApiModifiers: Story = {
  parameters: { structuredModifiers: true },
  play: async () => {
    await userEvent.click(fixture.button);
    await waitFor(() => expect(fixture.state.messages).toHaveLength(1));
    await expect(fixture.state.errors).toHaveLength(0);
    await expect(fixture.state.copiedText).toContain("## Item Level: 80");
    await expect(fixture.state.copiedText).toContain("{ Implicit Modifier }\n20(10-30)% increased Spell Damage");
    await expect(fixture.state.copiedText).toContain('{ Prefix Modifier "Sage\'s" (Tier: 3) }\n+50(40-59) to maximum Mana');
    await expect(fixture.state.copiedText).toContain('{ Desecrated Suffix Modifier "of the Void" (Tier: 2) }\n+12(10-15) to Intelligence');
    await expect(fixture.state.messages[0]).toMatchObject({ itemText: fixture.state.copiedText, itemId: item.id });
    await expect(document.querySelector("[data-poe-copy-tooltip]")).toHaveTextContent("Copied!");
    fixture.pass("Live API modifier objects copied successfully with implicit, explicit, and desecrated metadata.");
  },
};
