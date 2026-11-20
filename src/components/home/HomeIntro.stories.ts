import { withPageLayout } from "../../../.storybook/decorators";
import { POSTS } from "../../../.storybook/fixtures/posts";
import type { Meta, Story } from "../../../.storybook/types";
import HomeIntro from "./HomeIntro.astro";

const meta = {
	args: { class: "story-column", firstPost: POSTS.at(-1) },
	component: HomeIntro,
	decorators: [withPageLayout],
	parameters: { layout: "fullscreen" },
	tags: ["autodocs"],
	title: "Home/HomeIntro",
} satisfies Meta;

export default meta;

export const Default: Story = {};

/** 記事がまだないときは、最初の記事への案内を出さない */
export const NoPosts: Story = { args: { firstPost: undefined } };
