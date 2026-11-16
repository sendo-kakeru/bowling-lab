import type { StorybookConfig } from "@storybook-astro/framework";

// フォントは astro.config.mjs の fonts をフレームワークが読み込んで、@font-face と変数（--font-body など）を入れる
const config: StorybookConfig = {
	addons: ["storybook-addon-pseudo-states"],
	framework: {
		name: "@storybook-astro/framework",
		options: {},
	},
	stories: ["../src/**/*.stories.ts"],
};

export default config;
