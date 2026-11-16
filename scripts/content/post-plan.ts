import { formatIsoDate } from "../../src/utils/date.ts";

/*
  記事を作るコマンドの判断の部分。ファイル名と中身を決めるだけで、書き込みはしない
*/

export const POST_DIR = "src/content/posts";

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
	// page は /posts/page/2 のページ送りとぶつかるので、parsePostSlug が受け付けない
	const taken = new Set([
		"page",
		...existingSlugs.map((slug) => slug.replace(/^_/, "")),
	]);
	let name: string;
	do {
		name = Array.from({ length: SLUG_LENGTH }, () =>
			SLUG_CHARS.charAt(randomInt(SLUG_CHARS.length)),
		).join("");
	} while (taken.has(name));
	const source = `---\ntitle: ""\npublishedAt: ${formatIsoDate({ date })}\n---\n\n`;
	return { slug: `_${name}`, source };
}
