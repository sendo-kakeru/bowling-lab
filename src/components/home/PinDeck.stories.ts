import { withPageLayout } from "../../../.storybook/decorators";
import type { Meta, Story } from "../../../.storybook/types";
import PinDeck from "./PinDeck.astro";

/* ピンはカードの色なので、板目の上（withPageLayout）で確かめる。PLAY で投げられる */

const meta = {
	component: PinDeck,
	decorators: [withPageLayout],
	parameters: { layout: "fullscreen" },
	tags: ["autodocs"],
	title: "Home/PinDeck",
} satisfies Meta;

export default meta;

export const Default: Story = {};
