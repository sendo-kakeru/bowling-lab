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
 * 記事カードのサムネイルの切り抜き。枠の縦横比が違うので枠ごとに切り抜き、PostCard.astro が <picture> で出し分ける。
 * 1 つの切り抜きを object-fit: cover で別の比率の枠に入れると、スマホの正方形の枠には 2.2:1 の中央の半分も入らない。
 * 大きさは枠ごとに 1 つで、その枠を出す端末のいちばん高い DPR に合わせる。
 * - square: 768px 未満の 96px 角。3x のスマホで 288
 * - row: 768px 以上の一覧の 200 × 120px（5:3）。2x で 400
 * - tile: 768px 以上のホームのタイル。高さ 160px で幅は約 375px まで変わるので 2.2:1 で切り、object-fit: cover で枠に合わせる。
 *   いちばん広い枠（約 375 × 160px）の 2x で 768
 * DPR の低い画面は少し大きなファイルを受け取るが、この大きさでは差は小さい。
 * 変換は幅 × 形式で数えられ、無料枠は月 5,000 なので、記事 1 つあたり 3 つに抑える
 */
const THUMBNAIL_CROPS = {
	row: { aspect: { height: 3, width: 5 }, widths: [400] },
	square: { aspect: { height: 1, width: 1 }, widths: [288] },
	tile: { aspect: { height: 5, width: 11 }, widths: [768] },
} as const satisfies Record<string, CropRule>;

type ThumbnailCrops = Record<keyof typeof THUMBNAIL_CROPS, CroppedImage>;

/** 既定の画像（ボールの SVG）の寸法。いちばん横長の切り抜き（タイル）に合わせる */
const [TILE_WIDTH] = THUMBNAIL_CROPS.tile.widths;
const DEFAULT_THUMBNAIL_SIZE = {
	height: cropHeight({
		aspect: THUMBNAIL_CROPS.tile.aspect,
		width: TILE_WIDTH,
	}),
	width: TILE_WIDTH,
};

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
 * 既定のサムネイルの SVG。タイルの切り抜きと同じ大きさにし、object-fit: cover でどの枠に切り抜かれてもボールが欠けないよう中央に置く
 * （正方形の枠でも高さの 80% の直径なので収まる）。
 * Storybook は静的エンドポイントを配信しないので、.storybook/main.ts もこれで同じ URL に出す
 */
export function ballThumbnailSvg({ color }: { color: BallColorName }): string {
	const { width, height } = DEFAULT_THUMBNAIL_SIZE;
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

type ThumbnailImage =
	| { kind: "default"; src: string; width: number; height: number }
	| { kind: "crops"; crops: ThumbnailCrops };

/**
 * サムネイルの画像。メディアは枠ごとの切り抜き（変換配信の絶対 URL）、
 * 既定の画像は記事の色のボールの SVG のサイト内の相対 URL 1 つで、どの枠にも object-fit: cover で入れる
 */
export function getThumbnailImage({
	thumbnail,
	slug,
}: {
	thumbnail: Thumbnail;
	slug: string;
}): ThumbnailImage {
	if (thumbnail.source === "default") {
		const color = ballColorForSlug({ slug });
		return {
			...DEFAULT_THUMBNAIL_SIZE,
			kind: "default",
			src: `/thumbnails/${ballThumbnailName({ color })}.svg`,
		};
	}
	const { image } = thumbnail;
	return {
		crops: {
			row: toCroppedImage({ image, rule: THUMBNAIL_CROPS.row }),
			square: toCroppedImage({ image, rule: THUMBNAIL_CROPS.square }),
			tile: toCroppedImage({ image, rule: THUMBNAIL_CROPS.tile }),
		},
		kind: "crops",
	};
}
