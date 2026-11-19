import type { AstroRenderer } from "@storybook-astro/framework";
import type {
	ComponentAnnotations,
	StoryAnnotations,
} from "storybook/internal/types";
import ErrorPage from "./ErrorPage.astro";

const meta = {
	component: ErrorPage,
	tags: ["autodocs"],
	title: "Components/ErrorPage",
} satisfies ComponentAnnotations<AstroRenderer>;

export default meta;
type Story = StoryAnnotations<AstroRenderer>;

export const NotFound: Story = {
	args: {
		code: "404",
		label: "PAGE NOT FOUND",
		slots: {
			lead: "お探しのページは<wbr>見つかりませんでした",
			note: "URL が間違っているか、ページが移動または削除された可能性があります。",
		},
	},
};

export const ServerError: Story = {
	args: {
		code: "500",
		label: "SERVER ERROR",
		slots: {
			lead: "サーバーで<wbr>エラーが発生しました",
			note: "時間をおいて、もう一度お試しください。",
		},
	},
};
