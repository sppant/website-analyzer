import "../src/index.css";
import "../src/App.css";

import { MemoryRouter } from "react-router-dom";
import type { Preview } from "@storybook/react-vite";

const preview: Preview = {
  // Several components (LinkButton, Card as={Link}, nav links) render a
  // react-router <Link>, which needs a Router context to avoid throwing.
  decorators: [
    (Story) => (
      <MemoryRouter>
        <Story />
      </MemoryRouter>
    ),
  ],
  parameters: {
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/i,
      },
    },

    // The site is dark-themed only (see :root in App.css) — match it so
    // components don't render against Storybook's default white canvas.
    backgrounds: {
      default: "app",
      values: [{ name: "app", value: "#070b09" }],
    },

    a11y: {
      // 'todo' - show a11y violations in the test UI only
      // 'error' - fail CI on a11y violations
      // 'off' - skip a11y checks entirely
      test: "todo",
    },
  },
};

export default preview;
