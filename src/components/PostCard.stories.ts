import type { AstroRenderer } from "@storybook-astro/framework";
import type {
	ComponentAnnotations,
	StoryAnnotations,
} from "storybook/internal/types";
import { POSTS } from "../../.storybook/fixtures/posts";
import PostCard from "./PostCard.astro";

/* 768px 以上で抜粋が出る。ツールバーの表示幅で確かめる */

const [post, , postWithoutDescription, postWithLongTitle] = POSTS;

const meta = {
	args: { post },
	component: PostCard,
	tags: ["autodocs"],
	title: "Components/PostCard",
} satisfies ComponentAnnotations<AstroRenderer>;

export default meta;
type Story = StoryAnnotations<AstroRenderer>;

/** 記事一覧の横長のカード */
export const Row: Story = {};

/** ホームのタイル。768px 以上は画像が上の縦長になり、抜粋は出さない */
export const Tile: Story = {
	args: { headingLevel: 3, layout: "tile" },
};

/** 本文に文がなく、抜粋がない */
export const WithoutDescription: Story = {
	args: { post: postWithoutDescription },
};

export const LongTitle: Story = {
	args: { post: postWithLongTitle },
};
