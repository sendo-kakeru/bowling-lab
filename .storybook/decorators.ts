import type { AstroRenderer } from "@storybook-astro/framework";
import type { DecoratorFunction } from "storybook/internal/types";
import PageLayout from "../src/layouts/PageLayout.astro";

/** ページの部品を、本物と同じ枠（ヘッダー、レーン、スパット、フッター）の <slot /> に入れる */
export const withPageLayout: DecoratorFunction<AstroRenderer> = () => ({
	component: PageLayout,
	props: {},
});

/** カードと同じ色の部品を、板目の上に置く */
export const withLane: DecoratorFunction<AstroRenderer> = (Story) =>
	`<div class="story-lane">${Story()}</div>`;
