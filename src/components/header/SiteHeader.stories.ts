import type { Meta, Story } from "../../../.storybook/types";
import SiteHeader from "./SiteHeader.astro";

const meta = {
	component: SiteHeader,
	parameters: { layout: "fullscreen" },
	tags: ["autodocs"],
	title: "Components/SiteHeader",
} satisfies Meta;

export default meta;

/** 並びは画面幅で変わる（スマホはメニューのボタン、768px 以上で横並び）。ツールバーの表示幅で確かめる */
export const Default: Story = {};
