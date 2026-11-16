import type { AstroRenderer } from "@storybook-astro/framework";
import type {
	ComponentAnnotations,
	StoryAnnotations,
} from "storybook/internal/types";
import { withPageLayout } from "../../../.storybook/decorators";
import { MEMO_ONE_REPLY, MEMOS } from "../../../.storybook/fixtures/memos";
import LatestMemos from "./LatestMemos.astro";

const meta = {
	args: { class: "story-column", memos: MEMOS.slice(0, 2) },
	component: LatestMemos,
	decorators: [withPageLayout],
	parameters: { layout: "fullscreen" },
	tags: ["autodocs"],
	title: "Home/LatestMemos",
} satisfies ComponentAnnotations<AstroRenderer>;

export default meta;
type Story = StoryAnnotations<AstroRenderer>;

/** ホームに出す新しい 2 件 */
export const Default: Story = {};

export const Single: Story = {
	args: { memos: [MEMO_ONE_REPLY] },
};

export const Empty: Story = {
	args: { memos: [] },
};
