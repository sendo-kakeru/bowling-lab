import { defineCollection } from "astro:content";
import { glob } from "astro/loaders";

// コレクションには schema を渡さない。検証と型付けは取得関数（Valibot）で行う。
// 理由は docs/design/content.md の「スキーマと型」

const posts = defineCollection({
	loader: glob({
		base: "./src/content/posts",
		// 既定の id は小文字にするなど手を加えるので、ファイル名（スラッグ）とずれる
		generateId: ({ entry }) => entry.replace(/\.md$/, ""),
		pattern: "*.md",
	}),
});

const pages = defineCollection({
	loader: glob({ base: "./src/content/pages", pattern: "*.md" }),
});

export const collections = { pages, posts };
