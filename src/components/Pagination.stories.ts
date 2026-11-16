import type { AstroRenderer } from "@storybook-astro/framework";
import type {
	ComponentAnnotations,
	StoryAnnotations,
} from "storybook/internal/types";
import Pagination from "./Pagination.astro";

/* 番号の並べ方は src/utils/pagination.ts が決める。ここは props だけ渡す */

const meta = {
	args: { basePath: "/posts", pageCount: 12 },
	component: Pagination,
	tags: ["autodocs"],
	title: "Components/Pagination",
} satisfies ComponentAnnotations<AstroRenderer>;

export default meta;
type Story = StoryAnnotations<AstroRenderer>;

/** 1 ページ目。PREV は押せない */
export const Page1: Story = {
	args: { current: 1 },
};

export const Page2: Story = {
	args: { current: 2 },
};

/** 真ん中。両側を省く */
export const Page6: Story = {
	args: { current: 6 },
};

export const Page11: Story = {
	args: { current: 11 },
};

/** 最後のページ。NEXT は押せない */
export const Page12: Story = {
	args: { current: 12 },
};

/** ページが少なく、省くところがない */
export const FewPages: Story = {
	args: { current: 2, pageCount: 3 },
};

export const Playground: Story = {
	args: { current: 4 },
	argTypes: {
		current: { control: { min: 1, step: 1, type: "number" } },
		pageCount: { control: { min: 1, step: 1, type: "number" } },
	},
};
