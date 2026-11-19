import { POSTS } from "../../.storybook/fixtures/posts";
import type { Meta, Story } from "../../.storybook/types";
import Breadcrumb from "./Breadcrumb.astro";

const postWithLongTitle = POSTS[3];

const meta = {
	component: Breadcrumb,
	tags: ["autodocs"],
	title: "Components/Breadcrumb",
} satisfies Meta;

export default meta;

/** 一覧のページ */
export const List: Story = {
	args: {
		items: [{ href: "/", label: "HOME" }, { label: "POSTS" }],
	},
};

/** 記事のページ。最後の項目（今のページ）は長いと「…」で省く */
export const LongTitle: Story = {
	args: {
		items: [
			{ href: "/", label: "HOME" },
			{ href: "/posts", label: "POSTS" },
			{ label: postWithLongTitle?.title },
		],
	},
};
