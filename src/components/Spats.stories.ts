import { withLane } from "../../.storybook/decorators";
import type { Meta, Story } from "../../.storybook/types";
import Spats from "./Spats.astro";

const meta = {
	component: Spats,
	decorators: [withLane],
	tags: ["autodocs"],
	title: "Components/Spats",
} satisfies Meta;

export default meta;

/** フッターの直前に置く大きさ */
export const Default: Story = {};

/** カードの中に置く小さい版 */
export const Small: Story = {
	args: { size: "small" },
};
