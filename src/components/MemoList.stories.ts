import { withPageLayout } from "../../.storybook/decorators";
import { MEMOS } from "../../.storybook/fixtures/memos";
import type { Meta, Story } from "../../.storybook/types";
import MemoList from "./MemoList.astro";

const meta = {
	args: { current: 2, memos: MEMOS, pageCount: 12 },
	component: MemoList,
	decorators: [withPageLayout],
	parameters: { layout: "fullscreen" },
	tags: ["autodocs"],
	title: "Pages/MemoList",
} satisfies Meta;

export default meta;

export const Default: Story = {};

export const Empty: Story = {
	args: { current: 1, memos: [], pageCount: 1 },
};
