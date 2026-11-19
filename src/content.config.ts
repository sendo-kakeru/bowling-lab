import { defineCollection } from "astro:content";
import { glob } from "astro/loaders";
import { POST_DIR } from "./consts";
import { memoLoader } from "./loaders/memo-loader";

// コレクションには schema を渡さない。検証と型付けは取得関数（Valibot）で行う。
// 理由は docs/design/content.md の「スキーマと型」

const posts = defineCollection({
	loader: glob({
		base: POST_DIR,
		// 既定の id は小文字にするなど手を加えるので、ファイル名（スラッグ）とずれる
		generateId: ({ entry }) => entry.replace(/\.md$/, ""),
		pattern: "*.md",
	}),
});

// 1 ファイルに書き込みが複数並ぶので独自のローダーで読む。検証もローダーの中で行う
const memos = defineCollection({
	loader: memoLoader(),
});

export const collections = { memos, posts };
