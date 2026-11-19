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

/** 切り抜きの縦横比 */
interface Aspect {
	width: number;
	height: number;
}

interface CropCandidate {
	url: string;
	width: number;
	height: number;
}

/**
 * 縦横比で切り抜いた候補。fit=cover はマスターより大きい切り抜きを求めると拡大するので、
 * マスターから切り出せるいちばん大きな切り抜きで頭打ちにする
 */
function cropCandidates({
	image: { key, width, height },
	aspect,
	widths,
}: {
	image: StillImage;
	aspect: Aspect;
	widths: readonly number[];
}): CropCandidate[] {
	const max = Math.floor(
		Math.min(width, (height * aspect.width) / aspect.height),
	);
	return capWidths({ max, widths }).map((w) => {
		const h = Math.round((w * aspect.height) / aspect.width);
		return { height: h, url: imageUrl({ height: h, key, width: w }), width: w };
	});
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

/** 本文の `<img>` の alt を除いた属性。alt は Markdown の変換で付ける */
export function toImageAttributes({
	image: { key, width, height },
}: {
	image: StillImage;
}): Record<string, string | number> {
	return {
		decoding: "async",
		height,
		loading: "lazy",
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

interface CropRule {
	aspect: Aspect;
	sizes: string;
	widths: readonly number[];
}

/**
 * 記事冒頭の画像（アイキャッチ）の切り抜き。768px 以上は 5:2、未満は 16:9（src/pages/posts/[slug].astro の CSS）。
 * sizes は同じファイルの CSS から求めた表示幅で、少し大きめに見積もる。
 * Safari は sizes の min() / max() を読めず全体を 100vw として扱うので、calc() とメディア条件だけで書く。
 * 幅の候補は、各ブレークポイントの 1x / 2x の表示幅（768px で 598、1024px で 824、1280px 以上で 1056、スマホで 319〜677）を少し上回るように選んだ
 */
const EYECATCH_CROPS = {
	img: {
		aspect: { height: 9, width: 16 },
		sizes: "calc(91.41vw - 24px)",
		widths: [360, 720, 1080, 1440],
	},
	sources: [
		{
			aspect: { height: 2, width: 5 },
			media: "(width >= 768px)",
			sizes:
				"(width >= 1280px) 1056px, (width >= 1024px) calc(100vw - 200px), calc(100vw - 170px)",
			widths: [640, 840, 1056, 1280, 1680, 2112],
		},
	],
} as const satisfies {
	img: CropRule;
	sources: readonly (CropRule & { media: string })[];
};

interface ResponsiveImage {
	src: string;
	srcset: string;
	sizes: string;
	/** いちばん大きな候補の寸法。CSS で幅を決めるので、縦横比を伝えるためだけに使う */
	width: number;
	height: number;
}

type ResponsiveSource = Omit<ResponsiveImage, "src"> & { media: string };

function toResponsiveImage({
	image,
	rule: { aspect, sizes, widths },
}: {
	image: StillImage;
	rule: CropRule;
}): ResponsiveImage {
	const candidates = cropCandidates({ aspect, image, widths });
	const [smallest] = candidates;
	const largest = candidates.at(-1);
	if (smallest === undefined || largest === undefined) {
		throw new Error("切り抜きの候補がない");
	}
	return {
		height: largest.height,
		sizes,
		src: smallest.url,
		srcset: toSrcset({ candidates }),
		width: largest.width,
	};
}

/** アイキャッチの `<picture>` の中身。どの `<source>` の media にも当たらなければ img の切り抜き */
export function toEyecatchImage({ image }: { image: StillImage }): {
	img: ResponsiveImage;
	sources: ResponsiveSource[];
} {
	return {
		img: toResponsiveImage({ image, rule: EYECATCH_CROPS.img }),
		sources: EYECATCH_CROPS.sources.map((rule) => {
			const { src: _, ...source } = toResponsiveImage({ image, rule });
			return { ...source, media: rule.media };
		}),
	};
}

/**
 * サムネイルの切り抜き。card は記事カードの画像の枠でいちばん大きい、ホームのタイル（約 352 × 160px）の 2 倍。
 * ほかの枠（スマホの 96px 角、一覧の 200 × 120px）は CSS の object-fit: cover で中央を切り出す
 */
export const THUMBNAIL_CROPS = {
	card: { height: 320, width: 704 },
} as const;

export type ThumbnailCrop = keyof typeof THUMBNAIL_CROPS;
