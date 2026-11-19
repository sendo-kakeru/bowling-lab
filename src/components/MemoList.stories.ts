import { withPageLayout } from "../../.storybook/decorators";
import { MEMOS } from "../../.storybook/fixtures/memos";
import type { Meta, Story } from "../../.storybook/types";
import MemoList from "./MemoList.astro";

const meta = {
	args: { page: { items: MEMOS, page: 2, pageCount: 12 } },
	component: MemoList,
	decorators: [withPageLayout],
	parameters: { layout: "fullscreen" },
	tags: ["autodocs"],
	title: "Pages/MemoList",
} satisfies Meta;

export default meta;

export const Default: Story = {};

export const Empty: Story = {
	args: { page: { items: [], page: 1, pageCount: 1 } },
};
