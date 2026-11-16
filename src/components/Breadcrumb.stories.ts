import type { AstroRenderer } from "@storybook-astro/framework";
import type {
	ComponentAnnotations,
	StoryAnnotations,
} from "storybook/internal/types";
import Breadcrumb from "./Breadcrumb.astro";

const meta = {
	component: Breadcrumb,
	tags: ["autodocs"],
	title: "Components/Breadcrumb",
} satisfies ComponentAnnotations<AstroRenderer>;

export default meta;
type Story = StoryAnnotations<AstroRenderer>;

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
			{
				label:
					"親指を抜くタイミングを 3 週間かけて変えてみた記録と、そのあいだに気づいたことのまとめ",
			},
		],
	},
};
