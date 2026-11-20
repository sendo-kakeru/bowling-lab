import type { Meta, Story } from "../../.storybook/types";
import Card from "./Card.astro";

/* 中の余白は呼び出し側で決めるので、ストーリーでは p に余白を付けたものを入れる */

const meta = {
	args: {
		slots: {
			default:
				'<p class="story-card-body">カードの面。記事、固定ページ、記事のカードで使う。</p>',
		},
	},
	component: Card,
	tags: ["autodocs"],
	title: "Components/Card",
} satisfies Meta;

export default meta;

export const Default: Story = {};

/** 記事詳細のような大きな面。影が深い */
export const Raised: Story = {
	args: { as: "article", raised: true },
};
