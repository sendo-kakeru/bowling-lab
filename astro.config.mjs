// @ts-check

import sitemap from "@astrojs/sitemap";
import { defineConfig } from "astro/config";

// https://astro.build/config
export default defineConfig({
	integrations: [sitemap()],
	site: "https://bowling.sendo.page",
	// URL は末尾スラッシュなしで統一する（/posts、/posts/page/2）。
	// 既定のままだと canonical とサイトマップだけ /posts/ になり、サイト内リンクと食い違う。
	// 出力は posts/index.html のままなので、配信側でもスラッシュなしで返す設定が要る（docs/design/content.md）
	trailingSlash: "never",
});
