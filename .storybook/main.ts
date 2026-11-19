import type { StorybookConfig } from "@storybook-astro/framework";
import { BALL_COLOR_NAMES } from "../src/utils/ball.ts";
import { ballThumbnailName, ballThumbnailSvg } from "../src/utils/thumbnail.ts";

const ballThumbnails = BALL_COLOR_NAMES.map((color) => ({
	fileName: `thumbnails/${ballThumbnailName({ color })}.svg`,
	svg: ballThumbnailSvg({ color }),
}));

// フォントは astro.config.mjs の fonts をフレームワークが読み込んで、@font-face と変数（--font-body など）を入れる
const config: StorybookConfig = {
	addons: ["storybook-addon-pseudo-states"],
	framework: {
		name: "@storybook-astro/framework",
		options: {},
	},
	stories: ["../src/**/*.stories.ts"],
	// 既定のサムネイルは Astro の静的エンドポイントが作るので、Storybook では同じ URL に出し直す
	viteFinal: (viteConfig) => ({
		...viteConfig,
		plugins: [
			...(viteConfig.plugins ?? []),
			{
				configureServer(server) {
					server.middlewares.use((req, res, next) => {
						const thumbnail = ballThumbnails.find(
							({ fileName }) => req.url === `/${fileName}`,
						);
						if (!thumbnail) return next();
						res.setHeader("Content-Type", "image/svg+xml");
						res.end(thumbnail.svg);
					});
				},
				generateBundle() {
					for (const { fileName, svg } of ballThumbnails) {
						this.emitFile({ fileName, source: svg, type: "asset" });
					}
				},
				name: "ball-thumbnails",
			},
		],
	}),
};

export default config;
