import { TOC_ITEMS } from "../../../.storybook/fixtures/toc";
import type { Meta, Story } from "../../../.storybook/types";
import TableOfContents from "./TableOfContents.astro";

/* どちらの形を出すかは呼び出し側（src/pages/posts/[slug].astro）が画面幅で切り替える */

const meta = {
	args: { items: TOC_ITEMS },
	component: TableOfContents,
	tags: ["autodocs"],
	title: "Components/TableOfContents",
} satisfies Meta;

export default meta;

/** PC の右の列 */
export const Side: Story = {};

/** 1023px 以下で本文の上に折りたたむ */
export const Collapsible: Story = {
	args: { variant: "collapsible" },
};
