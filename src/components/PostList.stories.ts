import { withPageLayout } from "../../.storybook/decorators";
import { POSTS } from "../../.storybook/fixtures/posts";
import type { Meta, Story } from "../../.storybook/types";
import PostList from "./PostList.astro";

const meta = {
	args: { page: { items: POSTS, page: 1, pageCount: 12 } },
	component: PostList,
	decorators: [withPageLayout],
	parameters: { layout: "fullscreen" },
	tags: ["autodocs"],
	title: "Pages/PostList",
} satisfies Meta;

export default meta;

export const Default: Story = {};

/** 1 ページに収まる。ページ送りは出さない */
export const SinglePage: Story = {
	args: { page: { items: POSTS, page: 1, pageCount: 1 } },
};

export const Empty: Story = {
	args: { page: { items: [], page: 1, pageCount: 1 } },
};
