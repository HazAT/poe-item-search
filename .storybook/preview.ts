import type { Preview } from "@storybook/react-vite";
import "../src/index.css";

const preview: Preview = {
  parameters: {
    backgrounds: {
      options: {
        "poe-dark": { name: "poe-dark", value: "#161616" },
        "poe-gray": { name: "poe-gray", value: "#373737" },
        light: { name: "light", value: "#ffffff" },
      },
    },
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/i,
      },
    },
  },
  initialGlobals: { backgrounds: { value: "poe-dark" } },
};

export default preview;
