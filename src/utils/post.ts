import * as v from "valibot";

const DATE_ONLY_REGEX = /^\d{4}-\d{2}-\d{2}$/;

function isUtcMidnight({ date }: { date: Date }): boolean {
	return (
		date.getUTCHours() === 0 &&
		date.getUTCMinutes() === 0 &&
		date.getUTCSeconds() === 0 &&
		date.getUTCMilliseconds() === 0
	);
}

/** 「2026-11-15」を UTC 0 時の Date にする。形が違う・存在しない日付は Invalid Date */
function parseDateOnly({ text }: { text: string }): Date {
	if (!DATE_ONLY_REGEX.test(text)) return new Date(Number.NaN);
	const date = new Date(`${text}T00:00:00Z`);
	// 2 月 30 日は Invalid Date にならず 3 月 2 日に繰り上がるので、戻して比べる
	return !Number.isNaN(date.getTime()) &&
		date.toISOString().slice(0, 10) === text
		? date
		: new Date(Number.NaN);
}

/*
  publishedAt は日付だけを UTC 0 時の Date で持つ。日本時間では同じ日の 9 時なので、
  formatIsoDate などで日本時間に直しても書いた日付と一致する。
  引用符なしの `2026-11-15` は YAML が UTC 0 時の Date にして渡してくる。
  ただし YAML は存在しない日付（2026-02-30）を黙って翌月に繰り上げるので、その誤りはここでは見えない
*/
const PublishedAtSchema = v.union(
	[
		v.pipe(
			v.date(),
			v.check(
				(date) => isUtcMidnight({ date }),
				"publishedAt は日付だけを書く（時刻は書かない）",
			),
		),
		v.pipe(
			v.string(),
			v.transform((text) => parseDateOnly({ text })),
			v.date(),
		),
	],
	"publishedAt は YYYY-MM-DD の日付で書く",
);

export const PostFrontmatterSchema = v.object({
	description: v.optional(
		v.pipe(v.string(), v.nonEmpty("description は省くか、文を書く")),
	),
	publishedAt: PublishedAtSchema,
	thumbnail: v.optional(v.pipe(v.string(), v.startsWith("media:"))),
	title: v.pipe(v.string(), v.nonEmpty("title を書く")),
});

export type PostFrontmatter = v.InferOutput<typeof PostFrontmatterSchema>;

/** `_` は下書きの印。残りは英小文字・数字・ハイフンだけ */
const SLUG_REGEX = /^_?[a-z0-9]+(?:-[a-z0-9]+)*$/;
const DRAFT_PREFIX = "_";

const PostSlugSchema = v.pipe(
	v.string(),
	v.regex(SLUG_REGEX),
	// /posts/page/2 のページ送りとぶつかる。下書きも `_` を外して公開した時点でぶつかる
	v.check((slug) => slug.replace(DRAFT_PREFIX, "") !== "page"),
	v.brand("PostSlug"),
);

export type PostSlug = v.InferOutput<typeof PostSlugSchema>;

/** ファイルのパスからスラッグを作る。ファイル名（拡張子なし）がそのままスラッグになる */
export function parsePostSlug({ filePath }: { filePath: string }): {
	slug: PostSlug;
	isDraft: boolean;
} {
	const fileName = filePath.replace(/^.*\//, "").replace(/\.md$/, "");
	const result = v.safeParse(PostSlugSchema, fileName);
	if (!result.success) {
		throw new Error(
			`記事のファイル名は英小文字・数字・ハイフンだけにする（下書きは先頭に _、page は使えない）: ${filePath}`,
		);
	}
	return {
		isDraft: result.output.startsWith(DRAFT_PREFIX),
		slug: result.output,
	};
}

/** 並び順。publishedAt の新しい順、同じ日付はスラッグ（ファイル名）の昇順 */
export function comparePosts(
	a: { publishedAt: Date; slug: string },
	b: { publishedAt: Date; slug: string },
): number {
	const byDate = b.publishedAt.getTime() - a.publishedAt.getTime();
	if (byDate !== 0) return byDate;
	if (a.slug === b.slug) return 0;
	return a.slug < b.slug ? -1 : 1;
}

const NAMED_ENTITIES: Readonly<Record<string, string>> = {
	amp: "&",
	apos: "'",
	gt: ">",
	lt: "<",
	nbsp: " ",
	quot: '"',
};

function decodeEntities({ text }: { text: string }): string {
	return text.replace(
		/&(?:#x([0-9a-f]+)|#(\d+)|([a-z]+));/gi,
		(entity, hex: string | undefined, dec: string | undefined, name) => {
			if (hex) return String.fromCodePoint(Number.parseInt(hex, 16));
			if (dec) return String.fromCodePoint(Number.parseInt(dec, 10));
			return Object.hasOwn(NAMED_ENTITIES, name)
				? (NAMED_ENTITIES[name] ?? entity)
				: entity;
		},
	);
}

/** HTML からタグを外した文。文字参照を戻し、空白を 1 つに詰める */
function htmlToText({ html }: { html: string }): string {
	return decodeEntities({ text: html.replace(/<[^>]*>/g, "") })
		.replace(/\s+/g, " ")
		.trim();
}

const EXCERPT_LENGTH = 120;

/** description がないときの抜粋。コード、見出し、表は文として読めないので除く */
export function getExcerpt({ html }: { html: string }): string {
	const body = html
		.replace(/<pre[\s>][\s\S]*?<\/pre>/gi, " ")
		.replace(/<h([1-6])[\s>][\s\S]*?<\/h\1>/gi, " ")
		.replace(/<table[\s>][\s\S]*?<\/table>/gi, " ");
	// 文字数は書記素ではなくコードポイントで数える。絵文字の途中で切らないため
	const chars = [...htmlToText({ html: body })];
	if (chars.length <= EXCERPT_LENGTH) return chars.join("");
	return `${chars.slice(0, EXCERPT_LENGTH).join("")}…`;
}

const WORDS_PER_MINUTE = 200;
const CJK_CHARACTERS_PER_MINUTE = 500;
const CJK_CHARACTER_REGEX =
	/\p{Script=Han}|\p{Script=Hangul}|\p{Script=Hiragana}|\p{Script=Katakana}/gu;

/** 読了時間（分）。日本語は文字数、それ以外は語数で数える。最低 1 分 */
export function getReadingMinutes({ html }: { html: string }): number {
	const text = htmlToText({ html });
	const cjkCount = text.match(CJK_CHARACTER_REGEX)?.length ?? 0;
	const wordCount = text
		.replace(CJK_CHARACTER_REGEX, " ")
		.split(/\s+/)
		.filter(Boolean).length;
	const minutes = Math.ceil(
		wordCount / WORDS_PER_MINUTE + cjkCount / CJK_CHARACTERS_PER_MINUTE,
	);
	return Math.max(1, minutes);
}

export interface TocItem {
	/** 本文の見出しの id */
	id: string;
	depth: 2 | 3;
	text: string;
}

/** 見出しがこれより少ない記事は、目次を出さない */
const TOC_MIN_ITEMS = 3;

/** 本文の h2・h3 から目次を作る。少なすぎるときは空 */
export function getToc({
	headings,
}: {
	headings: readonly { depth: number; slug: string; text: string }[];
}): TocItem[] {
	const items = headings.flatMap(({ depth, slug, text }): TocItem[] =>
		depth === 2 || depth === 3 ? [{ depth, id: slug, text }] : [],
	);
	return items.length < TOC_MIN_ITEMS ? [] : items;
}
