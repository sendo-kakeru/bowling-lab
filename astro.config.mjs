// @ts-check

import { satteri } from "@astrojs/markdown-satteri";
import sitemap from "@astrojs/sitemap";
import { defineConfig, fontProviders } from "astro/config";
import { embedPlugin } from "./src/lib/markdown/embed.ts";
import { lineBreakPlugin } from "./src/lib/markdown/line-break-plugin.ts";
import { createMediaPlugin } from "./src/lib/markdown/media-plugin.ts";
import { sourceDigest } from "./src/lib/markdown/source-digest.ts";
import { tablePlugin } from "./src/lib/markdown/table-plugin.ts";
import { getMediaManifest } from "./src/lib/media/media-manifest.ts";

/**
 * Astro は設定を文字列にした値が前回と違うときだけ、描画済みの記事のキャッシュ（node_modules/.astro）を捨てる。
 * プラグインの関数は文字列にならないので、ソースのハッシュを載せて、出力を変えるコードの変更で記事を描画し直させる。
 * satteri は知らないキーを読まない
 * @template {object} P
 * @param {{ plugin: P; path: string }} args
 * @returns {P & { sourceDigest: string }}
 */
function withSourceDigest({ plugin, path }) {
	return {
		...plugin,
		sourceDigest: sourceDigest({ entry: new URL(path, import.meta.url) }),
	};
}

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
			hastPlugins: [
				withSourceDigest({
					path: "./src/lib/markdown/embed.ts",
					plugin: embedPlugin,
				}),
				withSourceDigest({
					path: "./src/lib/markdown/table-plugin.ts",
					plugin: tablePlugin,
				}),
			],
			mdastPlugins: [
				withSourceDigest({
					path: "./src/lib/markdown/line-break-plugin.ts",
					plugin: lineBreakPlugin,
				}),
				withSourceDigest({
					path: "./src/lib/markdown/media-plugin.ts",
					plugin: createMediaPlugin({ manifest: getMediaManifest() }),
				}),
			],
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
