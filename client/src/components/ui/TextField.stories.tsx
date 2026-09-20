import type { Meta, StoryObj } from "@storybook/react-vite";

import { TextField } from "./TextField";

const meta = {
  title: "UI/TextField",
  component: TextField,
  tags: ["autodocs"],
  args: {
    label: "Email",
    type: "email",
    placeholder: "you@example.com",
  },
} satisfies Meta<typeof TextField>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const WithHint: Story = {
  args: {
    label: "New password",
    type: "password",
    hint: "At least 8 characters.",
  },
};

export const WithError: Story = {
  args: {
    label: "Email",
    type: "email",
    error: "Enter your email and password.",
  },
};
