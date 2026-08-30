import type { Meta, StoryObj } from "@storybook/react-vite";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "./card";
import { Button } from "../button/button";

const meta = {
  component: Card,
} satisfies Meta<typeof Card>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Balance: Story = {
  render: () => (
    <Card className="w-72">
      <CardHeader>
        <CardTitle>Balance</CardTitle>
        <CardDescription>Mainnet</CardDescription>
      </CardHeader>
      <CardContent className="font-mono text-2xl tabular-nums">
        1.2345 ZEC
      </CardContent>
    </Card>
  ),
};

export const WithFooter: Story = {
  render: () => (
    <Card className="w-72">
      <CardHeader>
        <CardTitle>Replace this Wallet?</CardTitle>
        <CardDescription>The synced history is erased.</CardDescription>
      </CardHeader>
      <CardFooter className="gap-2">
        <Button variant="ghost">Cancel</Button>
        <Button variant="destructive">Replace</Button>
      </CardFooter>
    </Card>
  ),
};
