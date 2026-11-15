// @ts-check

import { satteri } from "@astrojs/markdown-satteri";
import sitemap from "@astrojs/sitemap";
import { defineConfig } from "astro/config";
import { embedPlugin } from "./src/utils/embed.ts";
import { getMediaManifest } from "./src/utils/media-manifest.ts";
import { createMediaPlugin } from "./src/utils/media-plugin.ts";

// https://astro.build/config
export default defineConfig({
	integrations: [sitemap()],
	markdown: {
		processor: satteri({
			hastPlugins: [embedPlugin],
			mdastPlugins: [createMediaPlugin({ manifest: getMediaManifest() })],
		}),
	},
	site: "https://bowling.sendo.page",
	// URL は末尾スラッシュなしで統一する（/posts、/posts/page/2）。
	// 既定のままだと canonical とサイトマップだけ /posts/ になり、サイト内リンクと食い違う。
	// 出力は posts/index.html のままなので、配信側でもスラッシュなしで返す設定が要る（docs/design/content.md）
	trailingSlash: "never",
});
