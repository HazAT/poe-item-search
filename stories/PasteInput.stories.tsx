import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, fn, userEvent, within } from "storybook/test";
import { useEffect, type ReactNode } from "react";
import { PasteInput } from "../src/components/paste/PasteInput";

const ITEM = `Item Class: Rings
Rarity: Rare
Doom Circle
Gold Ring
--------
+80 to maximum Life`;

function MockTradeApi({ children, pending }: { children: ReactNode; pending: boolean }) {
  useEffect(() => {
    const originalFetch = window.fetch;
    const searchMarker = localStorage.getItem("poe-search-extension-initiated");
    window.fetch = Object.assign(async (input: URL | RequestInfo, init?: RequestInit) => {
      const url = typeof input === "string" ? input : input instanceof URL ? input.href : input.url;
      if (!url.startsWith("https://www.pathofexile.com/api/")) return originalFetch(input, init);
      if (url.endsWith("/data/stats")) {
        return Response.json({
          result: [{ entries: [{ id: "explicit.stat_3299347043", text: "+# to maximum Life", type: "explicit" }] }],
        });
      }
      if (pending) return new Promise<Response>(() => undefined);
      return Response.json(
        { error: { message: "Rate limit exceeded" } },
        { status: 429, headers: { "Retry-After": "60" } },
      );
    }, originalFetch);
    return () => {
      window.fetch = originalFetch;
      if (searchMarker === null) localStorage.removeItem("poe-search-extension-initiated");
      else localStorage.setItem("poe-search-extension-initiated", searchMarker);
    };
  }, [pending]);

  return <div className="w-[360px] bg-poe-dark">{children}</div>;
}

const meta = {
  title: "Components/PasteInput",
  component: PasteInput,
  args: { onSearch: fn() },
  parameters: { layout: "centered" },
  decorators: [
    (Story, context) => (
      <MockTradeApi pending={context.parameters.pending === true}>
        <Story />
      </MockTradeApi>
    ),
  ],
} satisfies Meta<typeof PasteInput>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Empty: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByRole("button", { name: "Search" })).toBeDisabled();
  },
};

export const RateLimited: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByRole("textbox", { name: "Item text" }));
    await userEvent.paste(ITEM);
    await expect(await canvas.findByText("Too many requests. Try again in 60 seconds.")).toBeVisible();
    await expect(canvas.getByRole("textbox")).toHaveValue(ITEM);
    await expect(canvas.getByRole("button", { name: "Search" })).toBeEnabled();
  },
};

export const Searching: Story = {
  parameters: { pending: true },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByRole("textbox", { name: "Item text" }));
    await userEvent.paste(ITEM);
    await expect(await canvas.findByRole("button", { name: "Searching..." })).toBeDisabled();
  },
};

export const Base64Paste: Story = {
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByRole("textbox", { name: "Item text" }));
    await userEvent.paste(btoa(ITEM));
    await expect(await canvas.findByText("Too many requests. Try again in 60 seconds.")).toBeVisible();
    await expect(args.onSearch).toHaveBeenCalledWith(ITEM);
  },
};
