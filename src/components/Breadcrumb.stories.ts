import type { Meta, Story } from "../../.storybook/types";
import Breadcrumb from "./Breadcrumb.astro";

const meta = {
	component: Breadcrumb,
	tags: ["autodocs"],
	title: "Components/Breadcrumb",
} satisfies Meta;

export default meta;

/** 一覧のページ */
export const List: Story = {
	args: {
		ancestors: [{ href: "/", label: "HOME" }],
		current: "POSTS",
	},
};

/** 記事のページ。今のページ（current）は長いと「…」で省く */
export const LongTitle: Story = {
	args: {
		ancestors: [
			{ href: "/", label: "HOME" },
			{ href: "/posts", label: "POSTS" },
		],
		current:
			"親指を抜くタイミングを 3 週間かけて変えてみた記録と、そのあいだに気づいたことのまとめ",
	},
};
