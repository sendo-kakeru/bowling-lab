import type { AstroRenderer } from "@storybook-astro/framework";
import type {
	ComponentAnnotations,
	StoryAnnotations,
} from "storybook/internal/types";
import { withPageLayout } from "../../.storybook/decorators";
import { MEMOS } from "../../.storybook/fixtures/memos";
import MemoList from "./MemoList.astro";

const meta = {
	args: { current: 2, memos: MEMOS, pageCount: 12 },
	component: MemoList,
	decorators: [withPageLayout],
	parameters: { layout: "fullscreen" },
	tags: ["autodocs"],
	title: "Pages/MemoList",
} satisfies ComponentAnnotations<AstroRenderer>;

export default meta;
type Story = StoryAnnotations<AstroRenderer>;

export const Default: Story = {};

export const Empty: Story = {
	args: { current: 1, memos: [], pageCount: 1 },
};
