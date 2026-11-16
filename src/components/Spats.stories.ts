import type { AstroRenderer } from "@storybook-astro/framework";
import type {
	ComponentAnnotations,
	StoryAnnotations,
} from "storybook/internal/types";
import Spats from "./Spats.astro";

const meta = {
	component: Spats,
	decorators: [(Story) => `<div class="story-lane">${Story()}</div>`],
	tags: ["autodocs"],
	title: "Components/Spats",
} satisfies ComponentAnnotations<AstroRenderer>;

export default meta;
type Story = StoryAnnotations<AstroRenderer>;

/** フッターの直前に置く大きさ */
export const Default: Story = {};

/** カードの中に置く小さい版 */
export const Small: Story = {
	args: { size: "small" },
};
