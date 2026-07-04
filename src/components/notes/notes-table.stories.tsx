import type { Meta, StoryObj } from "@storybook/react-vite";
import { fn } from "storybook/test";
import { useState } from "react";
import type { Sort, SortKey } from "@/lib/notes";
import { sortNotes } from "@/lib/notes";
import { walletNotes } from "@/stories/fixtures";
import { NotesTable } from "./notes-table";

const meta = {
  component: NotesTable,
  args: { notes: walletNotes, sort: { key: "idx", dir: "asc" }, onSort: fn() },
} satisfies Meta<typeof NotesTable>;

export default meta;
type Story = StoryObj<typeof meta>;

function Demo({ notes = walletNotes }: { notes?: typeof walletNotes }) {
  const [sort, setSort] = useState<Sort>({ key: "idx", dir: "asc" });
  const onSort = (key: SortKey) =>
    setSort((s) =>
      s.key === key
        ? { key, dir: s.dir === "asc" ? "desc" : "asc" }
        : { key, dir: "asc" },
    );
  // The table virtualizes against the page's app-main scroller, so the story
  // reproduces that container (same as the Activity list).
  return (
    <div
      data-scroll-restoration-id="app-main"
      className="h-96 overflow-y-auto"
    >
      <NotesTable notes={sortNotes(notes, sort)} sort={sort} onSort={onSort} />
    </div>
  );
}

export const Default: Story = { render: () => <Demo /> };

export const Empty: Story = { render: () => <Demo notes={[]} /> };
