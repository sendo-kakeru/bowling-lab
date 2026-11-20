import { DRAFT_PREFIX, RESERVED_SLUG } from "../../src/lib/content/post.ts";
import { formatIsoDate } from "../../src/lib/date.ts";

/*
  記事を作るコマンドの判断の部分。ファイル名と中身を決めるだけで、書き込みはしない
*/

const SLUG_CHARS = "abcdefghijklmnopqrstuvwxyz0123456789";
const SLUG_LENGTH = 4;

/**
 * 省略可能な項目 PostFrontmatterSchema
 */
const OPTIONAL_FIELD_HINTS = [
	"# 以下は省略可",
	"# description: 概要文",
	"# thumbnail: media:2026/example/photo.jpg",
];

/**
 * `pnpm post`。`_` + ランダム 4 文字の下書きを、title が空で publishedAt が今日（日本時間）のフロントマターで作る。
 * 省略できる項目（description、thumbnail）はコメントで書き方を添える。
 * `_` を外して公開したときにぶつからないよう、`_` なしの同じ名前も使用済みとみなす
 */
export function planNewPost({
	date,
	existingSlugs,
	randomInt,
}: {
	date: Date;
	existingSlugs: readonly string[];
	/** 0 以上 max 未満の整数。node:crypto の randomInt を渡す */
	randomInt: (max: number) => number;
}): { slug: string; source: string } {
	const taken = new Set([
		RESERVED_SLUG,
		...existingSlugs.map((slug) =>
			slug.startsWith(DRAFT_PREFIX) ? slug.slice(DRAFT_PREFIX.length) : slug,
		),
	]);
	let name: string;
	do {
		name = Array.from({ length: SLUG_LENGTH }, () =>
			SLUG_CHARS.charAt(randomInt(SLUG_CHARS.length)),
		).join("");
	} while (taken.has(name));
	const source = [
		"---",
		'title: ""',
		`publishedAt: ${formatIsoDate({ date })}`,
		...OPTIONAL_FIELD_HINTS,
		"---",
		"",
		"",
	].join("\n");
	return { slug: `${DRAFT_PREFIX}${name}`, source };
}
