import { fromMarkdown } from "mdast-util-from-markdown";
import { MEDIA_ORIGIN } from "../consts.ts";
import type {
	MediaEntry,
	MediaManifest,
	VideoEntry,
} from "./media-manifest.ts";

/*
  md の `media:` の参照から、配信 URL と HTML の属性を組み立てる。
  astro.config.mjs からも読むので、astro:* は import しない。設計は docs/design/media.md
*/

export const MEDIA_SCHEME = "media:";

/**
 * manifest のキーの形（NFC）にそろえる。media:push は NFC でキーを書くが、
 * macOS の Finder からコピーしたパスは濁点が分かれた NFD のことがあり、見た目が同じでも引けない
 */
export function toLogicalPath({ ref }: { ref: string }): string {
	return ref.normalize("NFC");
}

/** `media:2026/a.jpg` から論理パス `2026/a.jpg` を取り出す。`media:` の参照でなければ undefined */
export function parseMediaRef({ url }: { url: string }): string | undefined {
	return url.startsWith(MEDIA_SCHEME)
		? toLogicalPath({ ref: url.slice(MEDIA_SCHEME.length) })
		: undefined;
}

/**
 * キーをパスの区切りごとにエンコードする。media:push は空白などを含む inbox のパスをそのままキーにするので、
 * そのまま繋ぐと srcset の区切り（空白・カンマ）や URL の # と ? と誤って読まれる
 */
function encodeKey({ key }: { key: string }): string {
	return key.split("/").map(encodeURIComponent).join("/");
}

/** 変換配信（Image Transformations）の URL。高さを渡すと切り抜く */
export function imageUrl({
	key,
	width,
	height,
}: {
	key: string;
	width: number;
	height?: number;
}): string {
	const options =
		height === undefined
			? `width=${width},format=auto`
			: `width=${width},height=${height},fit=cover,format=auto`;
	return `${MEDIA_ORIGIN}/cdn-cgi/image/${options}/${encodeKey({ key })}`;
}

export function videoUrl({ key }: { key: string }): string {
	return `${MEDIA_ORIGIN}/${encodeKey({ key })}`;
}

/** 本文の表示幅（--layout-content-width）。CSS ピクセル */
const CONTENT_WIDTH = 760;

/** 本文の画像の srcset の幅。1520 は本文の表示幅の 2 倍 */
const BODY_WIDTHS = [480, 760, 1136, 1520] as const;

/**
 * 候補の幅を上限で頭打ちにして重複を除く。
 * 超える候補を捨てるだけだと、幅 1000px のマスターが 760px までしか配信されないため
 */
function capWidths({
	widths,
	max,
}: {
	widths: readonly number[];
	max: number;
}): number[] {
	return [...new Set(widths.map((w) => Math.min(w, max)))];
}

function toSrcset({
	candidates,
}: {
	candidates: readonly { url: string; width: number }[];
}): string {
	return candidates.map(({ url, width }) => `${url} ${width}w`).join(", ");
}

/** 静止画として出すもの。動画ならポスター画像に動画の寸法を付ける */
interface StillImage {
	key: string;
	width: number;
	height: number;
}

export function toStillImage({ entry }: { entry: MediaEntry }): StillImage {
	const { width, height } = entry;
	return {
		height,
		key: entry.type === "image" ? entry.key : entry.poster,
		width,
	};
}

/** 本文の画像と動画の幅 / 高さ。prose.css が高さを画面の 80% に抑えるのに使う */
function mediaRatio({
	width,
	height,
}: {
	width: number;
	height: number;
}): number {
	return Math.round((width / height) * 10000) / 10000;
}

/**
 * `<img>` の alt を除いた属性。Markdown の変換と .astro の両方で使う。
 * alt は呼び出し側で付ける。.astro で属性を展開すると、あとから書いた同じ属性は上書きせず重複して出るため
 */
export function toImageAttributes({
	image: { key, width, height },
	loading = "lazy",
}: {
	image: StillImage;
	loading?: "lazy" | "eager";
}): Record<string, string | number> {
	return {
		decoding: "async",
		height,
		loading,
		sizes: `(width >= ${CONTENT_WIDTH}px) ${CONTENT_WIDTH}px, 100vw`,
		src: imageUrl({ key, width: Math.min(CONTENT_WIDTH, width) }),
		srcset: toSrcset({
			candidates: capWidths({ max: width, widths: BODY_WIDTHS }).map((w) => ({
				url: imageUrl({ key, width: w }),
				width: w,
			})),
		}),
		style: `--media-ratio: ${mediaRatio({ height, width })}`,
		width,
	};
}

/** ポスター画像の幅。本文の表示幅の 2 倍 */
const POSTER_WIDTH = CONTENT_WIDTH * 2;

export function toVideoAttributes({
	video: { key, poster, width, height },
	alt,
}: {
	video: VideoEntry;
	alt: string;
}): Record<string, string | number | boolean> {
	return {
		...(alt && { "aria-label": alt }),
		controls: true,
		height,
		playsinline: true,
		poster: imageUrl({ key: poster, width: Math.min(POSTER_WIDTH, width) }),
		preload: "metadata",
		src: videoUrl({ key }),
		style: `--media-ratio: ${mediaRatio({ height, width })}`,
		width,
	};
}

interface MarkdownNode {
	type: string;
	url?: string;
	children?: readonly MarkdownNode[];
}

function findFirstMediaPathIn({
	node,
}: {
	node: MarkdownNode;
}): string | undefined {
	if (node.type === "image" && node.url !== undefined) {
		return parseMediaRef({ url: node.url });
	}
	for (const child of node.children ?? []) {
		const path = findFirstMediaPathIn({ node: child });
		if (path !== undefined) return path;
	}
	return undefined;
}

/** 本文で最初の `media:` の画像の論理パス */
function findFirstMediaPath({
	markdown,
}: {
	markdown: string;
}): string | undefined {
	return findFirstMediaPathIn({ node: fromMarkdown(markdown) });
}

export type Thumbnail =
	| { source: "frontmatter" | "body"; image: StillImage }
	| { source: "default" };

/** サムネイルを決める。フロントマター、本文の最初の画像、既定の画像の順 */
export function decideThumbnail({
	thumbnail,
	markdown,
	manifest,
}: {
	/** フロントマターの thumbnail の論理パス */
	thumbnail?: string;
	markdown: string;
	manifest: MediaManifest;
}): Thumbnail {
	if (thumbnail !== undefined) {
		const entry = manifest[thumbnail];
		if (!entry) {
			throw new Error(
				`thumbnail の media:${thumbnail} が media-manifest.json にない`,
			);
		}
		return { image: toStillImage({ entry }), source: "frontmatter" };
	}
	const path = findFirstMediaPath({ markdown });
	if (path === undefined) return { source: "default" };
	const entry = manifest[path];
	if (!entry) {
		throw new Error(`media:${path} が media-manifest.json にない`);
	}
	return { image: toStillImage({ entry }), source: "body" };
}

/**
 * サムネイルの切り抜き。card は記事カードの画像の枠でいちばん大きい、ホームのタイル（約 352 × 160px）の 2 倍。
 * ほかの枠（スマホの 96px 角、一覧の 200 × 120px）は CSS の object-fit: cover で中央を切り出す
 */
export const THUMBNAIL_CROPS = {
	card: { height: 320, width: 704 },
} as const;

export type ThumbnailCrop = keyof typeof THUMBNAIL_CROPS;
