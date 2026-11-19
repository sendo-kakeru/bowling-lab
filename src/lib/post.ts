import { type DefaultTreeAdapterMap, parseFragment } from "parse5";
import * as v from "valibot";
import { MEDIA_SCHEME, toLogicalPath } from "./media";

const DATE_ONLY_REGEX = /^\d{4}-\d{2}-\d{2}$/;

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

const FRONTMATTER_REGEX = /^---\r?\n([\s\S]*?)\r?\n---/;
const PUBLISHED_AT_LINE_REGEX =
	/^publishedAt:[ \t]*(["']?)([^"'#\s]*)\1[ \t]*(?:#.*)?$/m;

/**
 * md のフロントマターに書かれた publishedAt の文字列。見つからなければ undefined。
 * 引用符なしの `2026-02-30` は YAML が黙って 3 月 2 日の Date に変えてしまい、
 * 変換後の値からは誤りが見えないので、書かれたままの文字列で検査する
 */
export function readPublishedAtSource({
	source,
}: {
	source: string;
}): string | undefined {
	const frontmatter = FRONTMATTER_REGEX.exec(source)?.[1];
	return frontmatter
		? PUBLISHED_AT_LINE_REGEX.exec(frontmatter)?.[2]
		: undefined;
}

/*
  publishedAt は日付だけを UTC 0 時の Date で持つ。日本時間では同じ日の 9 時なので、
  formatIsoDate などで日本時間に直しても書いた日付と一致する。
  入力は readPublishedAtSource で取った文字列
*/
const PublishedAtSchema = v.pipe(
	v.string("publishedAt は YYYY-MM-DD の日付で書く"),
	v.transform((text) => parseDateOnly({ text })),
	v.date("publishedAt は YYYY-MM-DD の、存在する日付で書く"),
);

// 知らない項目は落とす。綴りの誤り（descripton）や、効かない draft: true に気づけるように
export const PostFrontmatterSchema = v.strictObject(
	{
		description: v.optional(
			v.pipe(v.string(), v.nonEmpty("description は省くか、文を書く")),
		),
		publishedAt: PublishedAtSchema,
		/** `media:` を外した論理パス */
		thumbnail: v.optional(
			v.pipe(
				v.string(),
				v.startsWith(MEDIA_SCHEME),
				v.transform((ref) =>
					toLogicalPath({ ref: ref.slice(MEDIA_SCHEME.length) }),
				),
			),
		),
		title: v.pipe(v.string(), v.nonEmpty("title を書く")),
	},
	(issue) =>
		`知らない項目 ${issue.received}。書けるのは title、description、publishedAt、thumbnail`,
);

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

type HtmlNode = DefaultTreeAdapterMap["node"];

/** 読み手に見えない要素。中の文を数えない */
const HIDDEN_TAGS: ReadonlySet<string> = new Set([
	"script",
	"style",
	"template",
]);

/** 抜粋に入れない要素。コード、見出し、表は文として読めない */
const NON_PROSE_TAGS: ReadonlySet<string> = new Set([
	"pre",
	"h1",
	"h2",
	"h3",
	"h4",
	"h5",
	"h6",
	"table",
]);

/** 前後の文と続けて読まないよう、終わりに空白を入れる要素 */
const BLOCK_TAGS: ReadonlySet<string> = new Set([
	"blockquote",
	"br",
	"dd",
	"div",
	"dt",
	"figcaption",
	"li",
	"p",
	"td",
	"th",
]);

function hasAttribute({
	node,
	name,
}: {
	node: HtmlNode;
	name: string;
}): boolean {
	return "attrs" in node && node.attrs.some((attr) => attr.name === name);
}

/** 脚注の参照番号と、脚注の区画（見出しの「Footnotes」と戻るリンクを含む） */
function isFootnote({ node }: { node: HtmlNode }): boolean {
	return (
		hasAttribute({ name: "data-footnote-ref", node }) ||
		hasAttribute({ name: "data-footnotes", node })
	);
}

/**
 * HTML の文を、空白を 1 つに詰めて返す。タグは正規表現ではなく構文として読む。
 * 属性値の中の `>` やコメントで切れ目を誤らないため
 */
function htmlToText({
	html,
	skip,
}: {
	html: string;
	skip: (node: HtmlNode) => boolean;
}): string {
	const parts: string[] = [];
	const visit = ({ node }: { node: HtmlNode }): void => {
		if (node.nodeName === "#text" && "value" in node) {
			parts.push(node.value);
			return;
		}
		if (
			!("childNodes" in node) ||
			HIDDEN_TAGS.has(node.nodeName) ||
			skip(node)
		) {
			return;
		}
		for (const child of node.childNodes) visit({ node: child });
		if (BLOCK_TAGS.has(node.nodeName)) parts.push(" ");
	};
	visit({ node: parseFragment(html) });
	return parts.join("").replace(/\s+/g, " ").trim();
}

const EXCERPT_LENGTH = 120;

const graphemeSegmenter = new Intl.Segmenter("ja", { granularity: "grapheme" });

/** description がないときの抜粋。コード、見出し、表、脚注は除く */
export function getExcerpt({ html }: { html: string }): string {
	const text = htmlToText({
		html,
		skip: (node) => NON_PROSE_TAGS.has(node.nodeName) || isFootnote({ node }),
	});
	// 書記素で数える。結合した絵文字の途中で切らないため
	const chars = Array.from(
		graphemeSegmenter.segment(text),
		({ segment }) => segment,
	);
	if (chars.length <= EXCERPT_LENGTH) return chars.join("");
	return `${chars.slice(0, EXCERPT_LENGTH).join("").trimEnd()}…`;
}

export interface TocItem {
	/** 本文の見出しの id */
	id: string;
	depth: 2 | 3;
	text: string;
}

/** 見出しがこれより少ない記事は、目次を出さない */
const TOC_MIN_ITEMS = 3;

/** 脚注の区画の見出し（「Footnotes」）。本文の見出しではない */
const FOOTNOTE_HEADING_ID = "footnote-label";

/** 本文の h2・h3 から目次を作る。少なすぎるときは空 */
export function getToc({
	headings,
}: {
	headings: readonly { depth: number; slug: string; text: string }[];
}): TocItem[] {
	const items = headings.flatMap(({ depth, slug, text }): TocItem[] =>
		(depth === 2 || depth === 3) && slug !== FOOTNOTE_HEADING_ID
			? [{ depth, id: slug, text }]
			: [],
	);
	return items.length < TOC_MIN_ITEMS ? [] : items;
}
