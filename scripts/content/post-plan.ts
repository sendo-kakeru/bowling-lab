import { formatIsoDate } from "../../src/lib/date.ts";
import { DRAFT_PREFIX, RESERVED_SLUG } from "../../src/lib/post.ts";

/*
  記事を作るコマンドの判断の部分。ファイル名と中身を決めるだけで、書き込みはしない
*/

const SLUG_CHARS = "abcdefghijklmnopqrstuvwxyz0123456789";
const SLUG_LENGTH = 4;

/**
 * `pnpm post`。`_` + ランダム 4 文字の下書きを、title が空で publishedAt が今日（日本時間）のフロントマターで作る。
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
	const source = `---\ntitle: ""\npublishedAt: ${formatIsoDate({ date })}\n---\n\n`;
	return { slug: `${DRAFT_PREFIX}${name}`, source };
}
