import { afterEach, beforeEach, expect, test } from 'bun:test';
import { observeFilterChanges } from './tierInjector';

const globalNames = ['document', 'Element', 'MutationObserver', 'setTimeout', 'clearTimeout', 'setInterval', 'clearInterval'] as const;
const originalGlobals = new Map(globalNames.map(name => [name, Object.getOwnPropertyDescriptor(globalThis, name)]));
const timeouts = new Map<number, () => void>();
const intervals = new Map<number, () => void>();
const listeners = new Map<string, () => void>();
let nextTimer = 0;
let scans = 0;
let selected = true;
let controller: ReturnType<typeof observeFilterChanges>;

class FakeElement {
  dataset: { statId?: string } = {};
  constructor(readonly selector: string) {}
  matches(selector: string): boolean { return selector.split(', ').includes(this.selector); }
  closest(selector: string): FakeElement | null { return this.matches(selector) ? this : null; }
  querySelector(selector: string): object | null {
    if (this === group && selector === '.filter-title') return { textContent: 'Stat Filters' };
    if (this === row && selector === 'input[placeholder="min"]') return input;
    return null;
  }
  querySelectorAll(): FakeElement[] { return this === group && selected ? [row] : []; }
}

class FakeObserver {
  static current: FakeObserver;
  active = true;
  constructor(readonly callback: MutationCallback) { FakeObserver.current = this; }
  observe() {}
  disconnect() { this.active = false; }
  emit(target: FakeElement, addedNodes: FakeElement[]) {
    if (this.active) this.callback([{ type: 'childList', target, addedNodes, removedNodes: [] }] as unknown as MutationRecord[], this as unknown as MutationObserver);
  }
}

const trade = new FakeElement('#trade');
const group = new FakeElement('.filter-group');
const row = new FakeElement('.filter.full-span');
const input = new FakeElement('input[placeholder="min"]');

function flushTimeouts() {
  const pending = [...timeouts.values()];
  timeouts.clear();
  pending.forEach(callback => callback());
}

function tickIntervals() {
  [...intervals.values()].forEach(callback => callback());
}

beforeEach(() => {
  scans = 0;
  selected = true;
  row.dataset = {};
  timeouts.clear();
  intervals.clear();
  listeners.clear();
  const globals = {
    document: {
      querySelector: (selector: string) => selector === '#trade' ? trade : null,
      querySelectorAll: () => { scans++; return [group]; },
      addEventListener: (type: string, callback: () => void) => listeners.set(type, callback),
      removeEventListener: (type: string) => listeners.delete(type),
    },
    Element: FakeElement,
    MutationObserver: FakeObserver,
    setTimeout: (callback: () => void) => { timeouts.set(++nextTimer, callback); return nextTimer; },
    clearTimeout: (id: number) => timeouts.delete(id),
    setInterval: (callback: () => void) => { intervals.set(++nextTimer, callback); return nextTimer; },
    clearInterval: (id: number) => intervals.delete(id),
  };
  for (const [name, value] of Object.entries(globals)) Object.defineProperty(globalThis, name, { configurable: true, value });
});

afterEach(() => {
  controller?.disconnect();
  for (const name of globalNames) {
    const descriptor = originalGlobals.get(name);
    if (descriptor) Object.defineProperty(globalThis, name, descriptor);
    else Reflect.deleteProperty(globalThis, name);
  }
});

test.each([false, true])('autocomplete and result mutations do not add scans or retries (selected row: %s)', hasSelectedRow => {
  selected = hasSelectedRow;
  controller = observeFilterChanges();
  const initialScans = scans;
  for (const selector of ['.multiselect__content-wrapper', '.results', '.tier-dropdown-injected']) {
    for (let index = 0; index < 10; index++) {
      FakeObserver.current.emit(new FakeElement(selector), [new FakeElement('span')]);
      flushTimeouts();
    }
  }
  expect(scans).toBe(initialScans);
  expect(intervals.size).toBe(hasSelectedRow ? 1 : 0);
});

test('repeated real row changes share one retry timer, which stops when IDs arrive', () => {
  controller = observeFilterChanges();
  expect(intervals.size).toBe(1);
  for (let index = 0; index < 10; index++) {
    FakeObserver.current.emit(group, [row]);
    FakeObserver.current.emit(row, [input]);
    expect(timeouts.size).toBe(1);
    flushTimeouts();
    expect(intervals.size).toBe(1);
  }
  row.dataset.statId = 'explicit.unsupported';
  listeners.get('poe-stat-ids-extracted')!();
  flushTimeouts();
  expect(intervals.size).toBe(0);
});

test('retry work is bounded and disconnect cancels pending work and listeners', () => {
  controller = observeFilterChanges();
  for (let index = 0; index < 20; index++) tickIntervals();
  expect(scans).toBe(21);
  expect(intervals.size).toBe(0);
  FakeObserver.current.emit(group, [row]);
  controller?.disconnect();
  expect(timeouts.size).toBe(0);
  expect(intervals.size).toBe(0);
  expect(listeners.size).toBe(0);
  FakeObserver.current.emit(group, [row]);
  flushTimeouts();
  tickIntervals();
  expect(scans).toBe(21);
});
