import { describe, expect, test } from "vitest";
import { parsePostSlug, readPublishedAtSource } from "../../src/lib/post.ts";
import { planNewPost } from "./post-plan.ts";

const ALPHABET = "abcdefghijklmnopqrstuvwxyz0123456789";

/** 決めた文字を順に返す randomInt。文字を並べた文字列で指定する */
function sequence({ chars }: { chars: string }): (max: number) => number {
	let i = 0;
	return (max) => {
		expect(max).toBe(ALPHABET.length);
		return ALPHABET.indexOf(chars.charAt(i++ % chars.length));
	};
}

describe("planNewPost", () => {
	// UTC では 11 月 15 日だが、日本時間では 11 月 16 日
	const date = new Date("2026-11-15T15:20:00Z");

	test("`_` + 4 文字の下書きを、title が空で publishedAt が今日（日本時間）のフロントマターで作る", () => {
		const post = planNewPost({
			date,
			existingSlugs: [],
			randomInt: sequence({ chars: "k3f9" }),
		});

		expect(post).toEqual({
			slug: "_k3f9",
			source: [
				"---",
				'title: ""',
				"publishedAt: 2026-11-16",
				"# 以下は省略可",
				"# description: 概要文",
				"# thumbnail: media:2026/example/photo.jpg",
				"---",
				"",
				"",
			].join("\n"),
		});
		expect(parsePostSlug({ filePath: `${post.slug}.md` })).toEqual({
			isDraft: true,
			slug: "_k3f9",
		});
		expect(readPublishedAtSource({ source: post.source })).toBe("2026-11-16");
	});

	test("page はページ送りとぶつかるので引き直す", () => {
		const post = planNewPost({
			date,
			existingSlugs: [],
			randomInt: sequence({ chars: "pagek3f9" }),
		});

		expect(post.slug).toBe("_k3f9");
	});

	test("既にある名前は引き直す。`_` を外した公開済みの名前も避ける", () => {
		const post = planNewPost({
			date,
			existingSlugs: ["_k3f9", "q7m2"],
			randomInt: sequence({ chars: "k3f9q7m2z0z0" }),
		});

		expect(post.slug).toBe("_z0z0");
	});
});
