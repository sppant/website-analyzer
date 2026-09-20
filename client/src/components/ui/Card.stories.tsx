import { Link } from "react-router-dom";
import type { Meta, StoryObj } from "@storybook/react-vite";

import { Card } from "./Card";
import { Button } from "./Button";

const meta = {
  title: "UI/Card",
  component: Card,
  tags: ["autodocs"],
} satisfies Meta<typeof Card>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () => (
    <Card className="max-w-sm">
      <h2 className="m-0 text-xl text-white">Free</h2>
      <p className="mt-3.5 text-sm text-[var(--muted)]">
        <strong className="text-3xl font-extrabold text-white">$0</strong> / month
      </p>
    </Card>
  ),
};

export const Featured: Story = {
  render: () => (
    <Card featured className="max-w-sm">
      <h2 className="m-0 text-xl text-white">Pro</h2>
      <p className="mt-3.5 text-sm text-[var(--muted)]">
        <strong className="text-3xl font-extrabold text-white">$9</strong> / month
      </p>
      <Button className="mt-3.5">Upgrade to Pro</Button>
    </Card>
  ),
};

/** Compact padding + hover state, for list items like the dashboard's project cards. */
export const InteractiveAsLink: Story = {
  render: () => (
    <Card as={Link} to="/projects/1" interactive padding="sm" className="max-w-sm">
      <h3 className="m-0 text-white">example.com</h3>
      <p className="mt-2 text-sm text-[var(--muted)]">Last analyzed 2 days ago</p>
    </Card>
  ),
};
