import type { AstroRenderer } from "@storybook-astro/framework";
import type {
	ComponentAnnotations,
	StoryAnnotations,
} from "storybook/internal/types";
import {
	MEMO_LONG,
	MEMO_MANY_REPLIES,
	MEMO_NO_REPLY,
	MEMO_ONE_REPLY,
} from "../../.storybook/fixtures/memos";
import MemoSlip from "./MemoSlip.astro";

/* 伝票はカードと同じ色なので、板目の上（story-lane）に置く */

const meta = {
	args: { memo: MEMO_NO_REPLY },
	component: MemoSlip,
	decorators: [(Story) => `<div class="story-lane">${Story()}</div>`],
	tags: ["autodocs"],
	title: "Components/MemoSlip",
} satisfies ComponentAnnotations<AstroRenderer>;

export default meta;
type Story = StoryAnnotations<AstroRenderer>;

/** 続きがない。紙を重ねず、開閉もない */
export const NoReply: Story = {};

/** 続きが 1 件。後ろの紙は 1 枚 */
export const OneReply: Story = {
	args: { memo: MEMO_ONE_REPLY },
};

/** 続きが 4 件。後ろの紙は上限の 3 枚 */
export const ManyReplies: Story = {
	args: { memo: MEMO_MANY_REPLIES },
};

export const Long: Story = {
	args: { memo: MEMO_LONG },
};
