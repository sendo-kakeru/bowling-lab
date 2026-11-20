import { fromMarkdown } from "mdast-util-from-markdown";
import {
	BALL_COLOR_NAMES,
	type BallColorName,
	ballSvg,
} from "../svg/ball-svg.ts";
import { svgDocument } from "../svg/svg.ts";
import { TOKEN_COLORS } from "../token-colors.ts";
import {
	type CroppedImage,
	type CropRule,
	cropHeight,
	getMediaEntry,
	parseMediaRef,
	type StillImage,
	toCroppedImage,
	toStillImage,
} from "./media.ts";
import type { MediaManifest } from "./media-manifest.ts";

interface MarkdownNode {
	type: string;
	url?: string;
	children?: readonly MarkdownNode[];
}

/** 本文で最初の `media:` の画像の論理パス */
function findFirstMediaPath({
	node,
}: {
	node: MarkdownNode;
}): string | undefined {
	if (node.type === "image" && node.url !== undefined) {
		return parseMediaRef({ url: node.url });
	}
	for (const child of node.children ?? []) {
		const path = findFirstMediaPath({ node: child });
		if (path !== undefined) return path;
	}
	return undefined;
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
		const entry = getMediaEntry({
			manifest,
			path: thumbnail,
			ref: `thumbnail の media:${thumbnail}`,
		});
		return { image: toStillImage({ entry }), source: "frontmatter" };
	}
	const path = findFirstMediaPath({ node: fromMarkdown(markdown) });
	if (path === undefined) return { source: "default" };
	const entry = getMediaEntry({ manifest, path, ref: `media:${path}` });
	return { image: toStillImage({ entry }), source: "body" };
}

/**
 * 記事カードのサムネイルの切り抜き（2.2:1）。いちばん大きな候補は、ホームのタイルのいちばん広い枠（約 375 × 160px）の 2 倍。
 * 224 はスマホの 96px 角の枠（object-fit: cover で 96 × 2.2 ≒ 212px 幅の切り抜きが要る）用。枠ごとの表示幅は PostCard.astro の sizes
 */
const THUMBNAIL_CROP = {
	aspect: { height: 5, width: 11 },
	widths: [224, 352, 528, 768],
} as const satisfies CropRule;

const THUMBNAIL_WIDTH = Math.max(...THUMBNAIL_CROP.widths);

/** サムネイルの寸法（いちばん大きな候補）。既定の画像（ボールの SVG）もこの大きさにする */
const THUMBNAIL_SIZE = {
	height: cropHeight({ aspect: THUMBNAIL_CROP.aspect, width: THUMBNAIL_WIDTH }),
	width: THUMBNAIL_WIDTH,
};

export function toThumbnailImage({
	image,
}: {
	image: StillImage;
}): CroppedImage {
	return toCroppedImage({ image, rule: THUMBNAIL_CROP });
}

const FNV_OFFSET_BASIS = 0x811c9dc5;
const FNV_PRIME = 0x01000193;

/** FNV-1a（32 ビット）。並び順などに依らず、同じ記事はビルドし直しても同じ色になる */
function fnv1a({ text }: { text: string }): number {
	let hash = FNV_OFFSET_BASIS;
	for (const byte of new TextEncoder().encode(text)) {
		hash = Math.imul(hash ^ byte, FNV_PRIME) >>> 0;
	}
	return hash;
}

export function ballColorForSlug({ slug }: { slug: string }): BallColorName {
	const name =
		BALL_COLOR_NAMES[fnv1a({ text: slug }) % BALL_COLOR_NAMES.length];
	if (name === undefined) throw new Error("ボールの色が選べない");
	return name;
}

/** 既定のサムネイルのファイル名（拡張子なし）。src/pages/thumbnails/[name].svg.ts が作る */
export function ballThumbnailName({ color }: { color: BallColorName }): string {
	return `ball-${color}`;
}

/**
 * 既定のサムネイルの SVG。カードの切り抜きと同じ大きさにし、object-fit: cover でどの枠に切り抜かれてもボールが欠けないよう中央に置く。
 * Storybook は静的エンドポイントを配信しないので、.storybook/main.ts もこれで同じ URL に出す
 */
export function ballThumbnailSvg({ color }: { color: BallColorName }): string {
	const { width, height } = THUMBNAIL_SIZE;
	const ball = ballSvg({
		color,
		cx: width / 2,
		cy: height / 2,
		r: height * 0.4,
	});
	return svgDocument({
		content: `<rect width="${width}" height="${height}" fill="${TOKEN_COLORS["wood-100"]}"/>${ball}`,
		height,
		width,
	});
}

/**
 * サムネイルの画像。メディアは変換配信の URL（絶対）、既定の画像は記事の色のボールの SVG のサイト内の相対 URL で、srcset はない
 */
export function getThumbnailImage({
	thumbnail,
	slug,
}: {
	thumbnail: Thumbnail;
	slug: string;
}): Omit<CroppedImage, "srcset"> & { srcset?: string } {
	if (thumbnail.source === "default") {
		const color = ballColorForSlug({ slug });
		return {
			...THUMBNAIL_SIZE,
			src: `/thumbnails/${ballThumbnailName({ color })}.svg`,
		};
	}
	return toThumbnailImage({ image: thumbnail.image });
}
