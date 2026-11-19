import type { Meta, Story } from "../../.storybook/types";
import SiteFooter from "./SiteFooter.astro";

const meta = {
	component: SiteFooter,
	parameters: { layout: "fullscreen" },
	tags: ["autodocs"],
	title: "Components/SiteFooter",
} satisfies Meta;

export default meta;

export const Default: Story = {};
