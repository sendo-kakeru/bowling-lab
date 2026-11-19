import { BALL_COLOR_NAMES, type BallColorName, ballSvg } from "./ball-svg.ts";
import {
	imageUrl,
	THUMBNAIL_CROPS,
	type Thumbnail,
	type ThumbnailCrop,
} from "./media.ts";

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
	const { width, height } = THUMBNAIL_CROPS.card;
	const ball = ballSvg({
		color,
		cx: width / 2,
		cy: height / 2,
		r: height * 0.4,
	});
	return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}"><rect width="${width}" height="${height}" fill="#efe4d0"/>${ball}</svg>`;
}

/**
 * サムネイルの切り抜きの URL。メディアは変換配信の URL（絶対）、既定の画像は記事の色のボールの SVG のサイト内の相対 URL を返す。
 * 既定の画像はカードの切り抜きの大きさで作ってあり、crop に依らない
 */
export function getThumbnailUrl({
	thumbnail,
	slug,
	crop,
}: {
	thumbnail: Thumbnail;
	slug: string;
	crop: ThumbnailCrop;
}): string {
	if (thumbnail.source === "default") {
		const color = ballColorForSlug({ slug });
		return `/thumbnails/${ballThumbnailName({ color })}.svg`;
	}
	const { width, height } = THUMBNAIL_CROPS[crop];
	return imageUrl({ height, key: thumbnail.image.key, width });
}
