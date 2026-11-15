import { defineCollection } from "astro:content";
import { glob } from "astro/loaders";

// コレクションには schema を渡さない。検証と型付けは取得関数（Valibot）で行う。
// 理由は docs/design/content.md の「スキーマと型」

const posts = defineCollection({
	loader: glob({ base: "./src/content/posts", pattern: "*.md" }),
});

const pages = defineCollection({
	loader: glob({ base: "./src/content/pages", pattern: "*.md" }),
});

export const collections = { pages, posts };
