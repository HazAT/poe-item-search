import { afterEach, beforeEach, describe, expect, mock, test } from "bun:test";
import { copyToClipboard } from "./copyToClipboard";

const globalNames = ["navigator", "document", "HTMLElement", "HTMLInputElement", "HTMLTextAreaElement"] as const;
const originalGlobals = new Map(globalNames.map(name => [name, Object.getOwnPropertyDescriptor(globalThis, name)]));

class FakeElement {
  shadowRoot: { activeElement: FakeElement } | null = null;
  focus = mock((_options?: FocusOptions) => {});
}

class FakeInput extends FakeElement {
  selectionStart: number | null = 2;
  selectionEnd: number | null = 5;
  selectionDirection: "forward" | "backward" | "none" | null = "backward";
  setSelectionRange = mock((_start: number, _end: number, _direction?: string) => {});
}

class FakeTextarea extends FakeInput {
  value = "";
  readOnly = false;
  tabIndex = 0;
  style = {};
  select = mock(() => {});
  remove = mock(() => {});
}

let textarea: FakeTextarea;
let focusedInput: FakeInput;
let fakeNavigator: { clipboard?: { writeText: (text: string) => Promise<void> } };
let fakeDocument: {
  activeElement: FakeElement | null;
  createElement: ReturnType<typeof mock<(tag: string) => FakeTextarea>>;
  body: { appendChild: ReturnType<typeof mock<(element: FakeTextarea) => void>> };
  execCommand?: ReturnType<typeof mock<(command: string) => boolean>>;
  getSelection: () => typeof selection;
};
const savedRange = {};
const selection = {
  rangeCount: 1,
  getRangeAt: mock((_index: number) => ({ cloneRange: () => savedRange })),
  removeAllRanges: mock(() => {}),
  addRange: mock((_range: object) => {}),
};

beforeEach(() => {
  textarea = new FakeTextarea();
  focusedInput = new FakeInput();
  fakeNavigator = {};
  fakeDocument = {
    activeElement: focusedInput,
    createElement: mock((_tag: string) => textarea),
    body: { appendChild: mock((_element: FakeTextarea) => {}) },
    execCommand: mock((_command: string) => true),
    getSelection: () => selection,
  };
  selection.getRangeAt.mockClear();
  selection.removeAllRanges.mockClear();
  selection.addRange.mockClear();
  const globals = {
    navigator: fakeNavigator,
    document: fakeDocument,
    HTMLElement: FakeElement,
    HTMLInputElement: FakeInput,
    HTMLTextAreaElement: FakeTextarea,
  };
  for (const [name, value] of Object.entries(globals)) {
    Object.defineProperty(globalThis, name, { configurable: true, value });
  }
});

afterEach(() => {
  for (const name of globalNames) {
    const original = originalGlobals.get(name);
    if (original) Object.defineProperty(globalThis, name, original);
    else Reflect.deleteProperty(globalThis, name);
  }
});

describe("copyToClipboard", () => {
  const itemText = "Item Class: Wands\nRarity: Rare\nDoom Song\nCrystal Wand\n--------\n+50 to maximum Mana";

  test("uses the modern API without disturbing focus or selection", async () => {
    const writeText = mock(async (_text: string) => {});
    fakeNavigator.clipboard = { writeText };

    await copyToClipboard(itemText);

    expect(writeText).toHaveBeenCalledWith(itemText);
    expect(fakeDocument.createElement).not.toHaveBeenCalled();
    expect(focusedInput.focus).not.toHaveBeenCalled();
    expect(selection.removeAllRanges).not.toHaveBeenCalled();
  });

  test("falls back when the modern API rejects and copies the complete item text", async () => {
    fakeNavigator.clipboard = { writeText: async () => { throw new Error("Permission denied"); } };

    await copyToClipboard(itemText);

    expect(textarea.value).toBe(itemText);
    expect(textarea.setSelectionRange).toHaveBeenCalledWith(0, itemText.length);
    expect(fakeDocument.execCommand).toHaveBeenCalledWith("copy");
    expect(textarea.remove).toHaveBeenCalledTimes(1);
  });

  test("falls back when the modern API is unavailable and restores shadow-root focus and selection", async () => {
    const host = new FakeElement();
    const nestedHost = new FakeElement();
    host.shadowRoot = { activeElement: nestedHost };
    nestedHost.shadowRoot = { activeElement: focusedInput };
    fakeDocument.activeElement = host;

    await copyToClipboard(itemText);

    expect(fakeDocument.execCommand).toHaveBeenCalledWith("copy");
    expect(focusedInput.focus).toHaveBeenCalledWith({ preventScroll: true });
    expect(host.focus).not.toHaveBeenCalled();
    expect(focusedInput.setSelectionRange).toHaveBeenCalledWith(2, 5, "backward");
    expect(selection.removeAllRanges).toHaveBeenCalledTimes(1);
    expect(selection.addRange).toHaveBeenCalledWith(savedRange);
    expect(textarea.remove).toHaveBeenCalledTimes(1);
  });

  test("rejects a failed legacy copy and still cleans up and restores focus", async () => {
    fakeDocument.execCommand = mock(() => false);

    await expect(copyToClipboard(itemText)).rejects.toThrow("Copy failed");

    expect(textarea.remove).toHaveBeenCalledTimes(1);
    expect(focusedInput.focus).toHaveBeenCalledTimes(1);
    expect(focusedInput.setSelectionRange).toHaveBeenCalledWith(2, 5, "backward");
    expect(selection.addRange).toHaveBeenCalledWith(savedRange);
  });

  test("rejects when neither clipboard mechanism is available", async () => {
    delete fakeDocument.execCommand;

    await expect(copyToClipboard(itemText)).rejects.toThrow("Copy failed");

    expect(textarea.remove).toHaveBeenCalledTimes(1);
    expect(focusedInput.focus).toHaveBeenCalledTimes(1);
  });

  test("cleans up and restores selection when the legacy copy throws", async () => {
    fakeDocument.execCommand = mock(() => { throw new Error("Clipboard blocked"); });

    await expect(copyToClipboard(itemText)).rejects.toThrow("Clipboard blocked");

    expect(textarea.remove).toHaveBeenCalledTimes(1);
    expect(focusedInput.focus).toHaveBeenCalledTimes(1);
    expect(selection.addRange).toHaveBeenCalledWith(savedRange);
  });
});
