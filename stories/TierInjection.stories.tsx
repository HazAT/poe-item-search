import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, userEvent, waitFor, within } from "storybook/test";
// Match the content script's storage initialization before loading debug consumers.
import "../src/services/storage";
import { startStatIdObserver } from "../src/injected/statIdObserver";
import { injectTierDropdowns, observeFilterChanges } from "../src/services/tierInjector";
import { getTiersForStat } from "../src/services/tierData";

const LIFE = "explicit.stat_3299347043";
const FIRE_RESISTANCE = "explicit.stat_3372524247";

interface VueFilterRow extends HTMLDivElement {
  __vue__?: { $props: { filter: { id?: string } } };
}

function createRow(statId?: string) {
  const row = document.createElement("div") as VueFilterRow;
  row.className = "filter full-span";
  row.style.cssText = "display:flex;align-items:center;gap:12px;padding:12px;border:1px solid #373737";
  if (statId) row.__vue__ = { $props: { filter: { id: statId } } };
  const label = document.createElement("span");
  label.textContent = "Selected modifier";
  const input = document.createElement("input");
  input.placeholder = "min";
  input.setAttribute("aria-label", "Minimum stat value");
  input.style.cssText = "width:120px;padding:4px 6px;background:#161616;border:1px solid #7a7a7a;color:#fff8e1";
  const autocomplete = document.createElement("div");
  autocomplete.className = "multiselect__content-wrapper";
  autocomplete.hidden = true;
  row.append(label, input, autocomplete);
  return { row, input, autocomplete };
}

function setupFixture(lazy: boolean) {
  const trade = document.createElement("section");
  trade.id = "trade";
  trade.style.cssText = "max-width:560px;margin:24px auto;background:#0c0c0e;color:#fff8e1;font:14px sans-serif";
  const group = document.createElement("div");
  group.className = "filter-group";
  const heading = document.createElement("h2");
  heading.className = "filter-title";
  heading.textContent = "Stat Filters";
  const category = document.createElement("div");
  category.className = "filter-property";
  category.dataset.statId = "category";
  category.hidden = true;
  const categoryInput = document.createElement("input");
  categoryInput.className = "multiselect__input";
  categoryInput.placeholder = "Rings";
  category.append(categoryInput);
  const { row, input, autocomplete } = createRow(lazy ? undefined : LIFE);
  group.append(heading, row);
  const results = document.createElement("div");
  results.className = "results";
  results.hidden = true;
  trade.append(category, group, results);
  document.body.append(trade);

  const scans = { groups: 0, rows: 0, documentRows: 0 };
  const queryDocument = Document.prototype.querySelectorAll;
  const queryElement = Element.prototype.querySelectorAll;
  const recordScan = (selector: string, fromDocument: boolean) => {
    if (selector === ".filter-group") scans.groups++;
    if (selector.includes(".filter.full-span")) {
      scans.rows++;
      if (fromDocument) scans.documentRows++;
    }
  };
  Document.prototype.querySelectorAll = function (this: Document, selector: string) {
    recordScan(selector, true);
    return queryDocument.call(this, selector);
  } as typeof queryDocument;
  Element.prototype.querySelectorAll = function (this: Element, selector: string) {
    recordScan(selector, false);
    return queryElement.call(this, selector);
  } as typeof queryElement;

  const extractor = startStatIdObserver();
  const injector = observeFilterChanges();
  injectTierDropdowns();
  let disconnected = false;
  const disconnect = () => {
    if (disconnected) return;
    disconnected = true;
    extractor.disconnect();
    injector?.disconnect();
  };

  return {
    row, input, autocomplete, categoryInput, group, results, scans, disconnect,
    cleanup() {
      disconnect();
      Document.prototype.querySelectorAll = queryDocument;
      Element.prototype.querySelectorAll = queryElement;
      trade.remove();
    },
  };
}

let fixture: ReturnType<typeof setupFixture>;
const pause = (milliseconds: number) => new Promise<void>((resolve) => setTimeout(resolve, milliseconds));
const tierButton = () => within(fixture.row).findByTitle("Select tier", {}, { timeout: 1500 });

const meta = {
  title: "Integration/TierInjection",
  parameters: { layout: "centered" },
  beforeEach: ({ parameters }) => {
    const currentFixture = setupFixture(parameters.lazy === true);
    fixture = currentFixture;
    return () => currentFixture.cleanup();
  },
  render: () => <p className="text-poe-beige">Real trade filter observers and tier controls</p>,
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

export const MountsOnceAndUpdatesMinimum: Story = {
  play: async () => {
    const button = await tierButton();
    injectTierDropdowns();
    injectTierDropdowns();
    await expect(fixture.row.querySelectorAll(".tier-dropdown-injected")).toHaveLength(1);
    await expect(fixture.row.querySelectorAll(".tier-input-wrapper")).toHaveLength(1);
    const tier = getTiersForStat(LIFE, "Rings")![0];
    await userEvent.click(button);
    await userEvent.click(await within(fixture.row).findByText(`T${tier.tier} ${tier.name}`));
    await expect(fixture.input).toHaveValue(String(tier.avgMin));
    await waitFor(() => expect(within(fixture.row).getByTitle("Select tier")).toHaveTextContent(`T${tier.tier}`));
  },
};

export const IgnoresAutocompleteAndResultsChurn: Story = {
  play: async () => {
    await tierButton();
    fixture.input.value = "47";
    fixture.input.dispatchEvent(new Event("input", { bubbles: true }));
    await pause(250);
    const idleStart = { ...fixture.scans };
    await pause(700);
    const idleRowScans = fixture.scans.rows - idleStart.rows;
    const beforeChurn = { ...fixture.scans };
    for (let index = 0; index < 30; index++) {
      const result = document.createElement("div");
      result.textContent = `Trade result ${index}`;
      fixture.results.replaceChildren(result);
      const option = document.createElement("span");
      option.className = "multiselect__option";
      option.textContent = `Suggested modifier ${index}`;
      fixture.autocomplete.replaceChildren(option);
      fixture.autocomplete.setAttribute("aria-expanded", String(index % 2 === 0));
      await pause(20);
    }
    await pause(150);
    await expect(fixture.scans.groups - beforeChurn.groups).toBe(0);
    await expect(fixture.scans.documentRows - beforeChurn.documentRows).toBe(0);
    // The extractor retains its scoped 500ms backup for Vue-only changes.
    await expect(fixture.scans.rows - beforeChurn.rows).toBeLessThanOrEqual(idleRowScans + 1);
    await expect(fixture.row.querySelectorAll(".tier-dropdown-injected")).toHaveLength(1);
    await expect(fixture.group.querySelector(".filter.full-span")).toBe(fixture.row);
    await expect(fixture.row.dataset.statId).toBe(LIFE);
    await expect(fixture.row.querySelector('input[placeholder="min"]')).toBe(fixture.input);
    await expect(fixture.input).toHaveValue("47");
  },
};

export const HandlesLazyVueIds: Story = {
  parameters: { lazy: true },
  play: async () => {
    await expect(fixture.row.querySelector(".tier-dropdown-injected")).toBeNull();
    // Vue attaches this object without changing the DOM; the backup must discover it.
    fixture.row.__vue__ = { $props: { filter: { id: LIFE } } };
    await tierButton();
    await expect(fixture.row.dataset.statId).toBe(LIFE);
    await expect(fixture.row.querySelectorAll(".tier-dropdown-injected")).toHaveLength(1);
    await pause(650);
    await expect(fixture.row.querySelectorAll(".tier-input-wrapper")).toHaveLength(1);
  },
};

export const ReconcilesReusedRows: Story = {
  play: async () => {
    await tierButton();
    const firstControl = fixture.row.querySelector(".tier-dropdown-injected")!;
    fixture.categoryInput.placeholder = "Gloves";
    await waitFor(() => expect(firstControl.childElementCount).toBe(0));
    const gloveControl = fixture.row.querySelector(".tier-dropdown-injected");
    await expect(gloveControl).not.toBe(firstControl);
    await userEvent.click(await tierButton());
    const gloveTier = getTiersForStat(LIFE, "Gloves")![0];
    await userEvent.click(await within(fixture.row).findByText(`T${gloveTier.tier} ${gloveTier.name}`));
    await expect(fixture.input).toHaveValue(String(gloveTier.avgMin));
    await expect(fixture.row.dataset.statId).toBe(LIFE);

    fixture.row.__vue__!.$props.filter.id = FIRE_RESISTANCE;
    await waitFor(() => expect(fixture.row.dataset.statId).toBe(FIRE_RESISTANCE), { timeout: 1500 });
    await waitFor(() => expect(fixture.row.querySelector(".tier-dropdown-injected")).not.toBe(gloveControl));
    await userEvent.click(await tierButton());
    const tier = getTiersForStat(FIRE_RESISTANCE, "Gloves")![0];
    await userEvent.click(await within(fixture.row).findByText(`T${tier.tier} ${tier.name}`));
    await expect(fixture.input).toHaveValue(String(tier.avgMin));
    fixture.row.__vue__!.$props.filter.id = "explicit.unknown-stat";
    await waitFor(() => expect(fixture.row.querySelector(".tier-dropdown-injected")).toBeNull(), { timeout: 1500 });
    await expect(fixture.row.querySelector(".tier-input-wrapper")).toBeNull();
    await expect(fixture.input.style.paddingRight).toBe("6px");
  },
};

export const CleansDetachedRowsAndDisconnects: Story = {
  play: async () => {
    await tierButton();
    const originalControl = fixture.row.querySelector(".tier-dropdown-injected")!;
    const replacementInput = createRow(LIFE).input;
    replacementInput.value = "47";
    fixture.input.replaceWith(replacementInput);
    await waitFor(() => expect(originalControl.childElementCount).toBe(0), { timeout: 1500 });
    await expect(replacementInput.isConnected).toBe(true);
    await expect(fixture.row.querySelector('input[placeholder="min"]')).toBe(replacementInput);
    await expect(replacementInput).toHaveValue("47");
    await expect(fixture.row.dataset.statId).toBe(LIFE);
    await expect(fixture.row.querySelectorAll(".tier-dropdown-injected")).toHaveLength(1);
    await expect(fixture.row.querySelectorAll(".tier-input-wrapper")).toHaveLength(1);
    await userEvent.click(await tierButton());
    const tier = getTiersForStat(LIFE, "Rings")![0];
    await userEvent.click(await within(fixture.row).findByText(`T${tier.tier} ${tier.name}`));
    await expect(replacementInput).toHaveValue(String(tier.avgMin));

    const control = fixture.row.querySelector(".tier-dropdown-injected")!;
    fixture.row.remove();
    await waitFor(() => expect(control.childElementCount).toBe(0), { timeout: 1500 });
    await expect(fixture.row.querySelector(".tier-input-wrapper")).toBeNull();
    await expect(fixture.input.style.paddingRight).toBe("6px");
    await expect(replacementInput.style.paddingRight).toBe("6px");

    const next = createRow(LIFE);
    fixture.group.append(next.row);
    fixture.disconnect();
    const afterDisconnect = { ...fixture.scans };
    next.row.dataset.statId = LIFE;
    document.dispatchEvent(new CustomEvent("poe-stat-ids-extracted", { detail: { count: 1 } }));
    await pause(650);
    await expect(next.row.querySelector(".tier-dropdown-injected")).toBeNull();
    await expect(fixture.scans).toEqual(afterDisconnect);
  },
};
