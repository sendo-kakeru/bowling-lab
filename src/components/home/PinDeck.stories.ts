import type { AstroRenderer } from "@storybook-astro/framework";
import type {
	ComponentAnnotations,
	StoryAnnotations,
} from "storybook/internal/types";
import { withPageLayout } from "../../../.storybook/decorators";
import PinDeck from "./PinDeck.astro";

/* ピンはカードの色なので、板目の上（withPageLayout）で確かめる。PLAY で投げられる */

const meta = {
	component: PinDeck,
	decorators: [withPageLayout],
	parameters: { layout: "fullscreen" },
	tags: ["autodocs"],
	title: "Home/PinDeck",
} satisfies ComponentAnnotations<AstroRenderer>;

export default meta;
type Story = StoryAnnotations<AstroRenderer>;

export const Default: Story = {};
