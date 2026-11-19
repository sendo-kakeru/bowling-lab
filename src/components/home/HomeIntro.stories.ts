import { withPageLayout } from "../../../.storybook/decorators";
import type { Meta, Story } from "../../../.storybook/types";
import HomeIntro from "./HomeIntro.astro";

const meta = {
	args: { class: "story-column" },
	component: HomeIntro,
	decorators: [withPageLayout],
	parameters: { layout: "fullscreen" },
	tags: ["autodocs"],
	title: "Home/HomeIntro",
} satisfies Meta;

export default meta;

export const Default: Story = {};
