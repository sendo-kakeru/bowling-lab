import type { AstroRenderer } from "@storybook-astro/framework";
import type {
	ComponentAnnotations,
	StoryAnnotations,
} from "storybook/internal/types";
import SiteFooter from "./SiteFooter.astro";

const meta = {
	component: SiteFooter,
	parameters: { layout: "fullscreen" },
	tags: ["autodocs"],
	title: "Components/SiteFooter",
} satisfies ComponentAnnotations<AstroRenderer>;

export default meta;
type Story = StoryAnnotations<AstroRenderer>;

export const Default: Story = {};
