import type { AstroRenderer } from "@storybook-astro/framework";
import type {
	ComponentAnnotations,
	StoryAnnotations,
} from "storybook/internal/types";
import { withPageLayout } from "../../.storybook/decorators";
import { POSTS } from "../../.storybook/fixtures/posts";
import PostList from "./PostList.astro";

const meta = {
	args: { current: 1, pageCount: 12, posts: POSTS },
	component: PostList,
	decorators: [withPageLayout],
	parameters: { layout: "fullscreen" },
	tags: ["autodocs"],
	title: "Pages/PostList",
} satisfies ComponentAnnotations<AstroRenderer>;

export default meta;
type Story = StoryAnnotations<AstroRenderer>;

export const Default: Story = {};

/** 1 ページに収まる。ページ送りは出さない */
export const SinglePage: Story = {
	args: { pageCount: 1 },
};

export const Empty: Story = {
	args: { pageCount: 1, posts: [] },
};
