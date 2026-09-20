import type { Meta, StoryObj } from "@storybook/react-vite";

import { Button, LinkButton } from "./Button";

const meta = {
  title: "UI/Button",
  component: Button,
  tags: ["autodocs"],
  argTypes: {
    variant: {
      control: "select",
      options: ["primary", "secondary", "ghost", "link"],
    },
    size: { control: "select", options: ["md", "sm"] },
  },
  args: {
    children: "Upgrade to Pro",
    disabled: false,
  },
} satisfies Meta<typeof Button>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Primary: Story = {
  args: { variant: "primary" },
};

export const Secondary: Story = {
  args: { variant: "secondary", children: "Create a free account" },
};

export const Ghost: Story = {
  args: { variant: "ghost", size: "sm", children: "Reject" },
};

export const Link: Story = {
  args: { variant: "link", children: "Manage billing" },
};

export const Disabled: Story = {
  args: { variant: "primary", disabled: true, children: "Starting checkout…" },
};

export const Small: Story = {
  args: { variant: "primary", size: "sm", children: "Accept analytics" },
};

/** Same visual variants, rendered as a router `<Link>` instead of a `<button>`. */
export const AsLinkButton: Story = {
  render: (args) => (
    <LinkButton to="/signup" variant={args.variant} size={args.size}>
      {args.children}
    </LinkButton>
  ),
  args: { variant: "primary" },
};

export const AllVariants: Story = {
  render: () => (
    <div className="flex flex-wrap items-center gap-3">
      <Button variant="primary">Primary</Button>
      <Button variant="secondary">Secondary</Button>
      <Button variant="ghost" size="sm">
        Ghost
      </Button>
      <Button variant="link">Link</Button>
      <Button variant="primary" disabled>
        Disabled
      </Button>
    </div>
  ),
};
