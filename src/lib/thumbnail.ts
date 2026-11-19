import {
	BALL_COLOR_NAMES,
	type BallColorName,
	ballSvg,
	svgDocument,
} from "./ball-svg.ts";
import {
	type CroppedImage,
	THUMBNAIL_SIZE,
	type Thumbnail,
	toThumbnailImage,
} from "./media.ts";
import { TOKEN_COLORS } from "./token-colors.ts";

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
