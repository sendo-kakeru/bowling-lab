// @ts-check

import { satteri } from "@astrojs/markdown-satteri";
import sitemap from "@astrojs/sitemap";
import { defineConfig, fontProviders } from "astro/config";
import { embedPlugin } from "./src/lib/embed.ts";
import { getMediaManifest } from "./src/lib/media-manifest.ts";
import { createMediaPlugin } from "./src/lib/media-plugin.ts";
import { tablePlugin } from "./src/lib/table-plugin.ts";

// https://astro.build/config
export default defineConfig({
	devToolbar: { enabled: false },
	fonts: [
		{
			cssVariable: "--font-body",
			// 日本語は Noto Sans JP で表示する。Noto Sans JP は Base.astro で Google Fonts の
			// <link> から読み込む（fonts で読み込むと書体名にハッシュが付き、ここで名前を指定できないため）
			fallbacks: ["Noto Sans JP", "sans-serif"],
			name: "Inter",
			provider: fontProviders.google(),
			weights: ["400 700"],
		},
		{
			cssVariable: "--font-display",
			fallbacks: ["Noto Sans JP", "sans-serif"],
			name: "Barlow Condensed",
			provider: fontProviders.google(),
			weights: [500, 600, 700, 800],
		},
	],
	integrations: [sitemap()],
	markdown: {
		processor: satteri({
			hastPlugins: [embedPlugin, tablePlugin],
			mdastPlugins: [createMediaPlugin({ manifest: getMediaManifest() })],
		}),
		// コードは色を付けず、prose.css の明るい地と本文の色で出す（Shiki は style 属性で地の色を上書きする）
		syntaxHighlight: false,
	},
	site: "https://bowling.sendo.page",
	// URL は末尾スラッシュなしで統一する（/posts、/posts/page/2）。
	// 既定のままだと canonical とサイトマップだけ /posts/ になり、サイト内リンクと食い違う。
	// 出力は posts/index.html のままなので、配信側でもスラッシュなしで返す設定が要る（docs/design/content.md）
	trailingSlash: "never",
});
