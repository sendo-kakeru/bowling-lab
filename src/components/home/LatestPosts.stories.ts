import type { AstroRenderer } from "@storybook-astro/framework";
import type {
	ComponentAnnotations,
	StoryAnnotations,
} from "storybook/internal/types";
import { withPageLayout } from "../../../.storybook/decorators";
import { POSTS } from "../../../.storybook/fixtures/posts";
import LatestPosts from "./LatestPosts.astro";

/* スマホは横長のカードで 1 列、768px 以上は縦長のタイルで 3 列。ツールバーの表示幅で確かめる */

const meta = {
	args: { posts: POSTS.slice(0, 3) },
	component: LatestPosts,
	decorators: [withPageLayout],
	parameters: { layout: "fullscreen" },
	tags: ["autodocs"],
	title: "Home/LatestPosts",
} satisfies ComponentAnnotations<AstroRenderer>;

export default meta;
type Story = StoryAnnotations<AstroRenderer>;

/** ホームに出す新しい 3 件 */
export const Default: Story = {};

export const Empty: Story = {
	args: { posts: [] },
};
