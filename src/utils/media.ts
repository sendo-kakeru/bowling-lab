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

const MEDIA_SCHEME = "media:";

/** `media:2026/a.jpg` から論理パス `2026/a.jpg` を取り出す。`media:` の参照でなければ undefined */
export function parseMediaRef({ url }: { url: string }): string | undefined {
	return url.startsWith(MEDIA_SCHEME)
		? url.slice(MEDIA_SCHEME.length)
		: undefined;
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
	return `${MEDIA_ORIGIN}/cdn-cgi/image/${options}/${key}`;
}

export function videoUrl({ key }: { key: string }): string {
	return `${MEDIA_ORIGIN}/${key}`;
}

/** 本文の表示幅（--layout-content-width）。CSS ピクセル */
const CONTENT_WIDTH = 760;

const SRCSET_WIDTHS = [192, 480, 760, 1136, 1520, 2272] as const;

/**
 * srcset に出す幅。候補をマスターの幅で頭打ちにして重複を除く。
 * 超える候補を捨てるだけだと、幅 1000px のマスターが 760px までしか配信されないため
 */
export function srcsetWidths({ width }: { width: number }): number[] {
	return [...new Set(SRCSET_WIDTHS.map((w) => Math.min(w, width)))];
}

/** 静止画として出すもの。動画ならポスター画像に動画の寸法を付ける */
export interface StillImage {
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
		srcset: srcsetWidths({ width })
			.map((w) => `${imageUrl({ key, width: w })} ${w}w`)
			.join(", "),
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
export function findFirstMediaPath({
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
	// 本文の参照の有無は Markdown の変換が確かめるので、ここでは見つかったものだけ使う
	const entry = path === undefined ? undefined : manifest[path];
	return entry
		? { image: toStillImage({ entry }), source: "body" }
		: { source: "default" };
}

/** サムネイルの切り抜き。card は 96px 角の 2 倍 */
export const THUMBNAIL_CROPS = {
	card: { height: 192, width: 192 },
	ogp: { height: 630, width: 1200 },
} as const;

export type ThumbnailCrop = keyof typeof THUMBNAIL_CROPS;
