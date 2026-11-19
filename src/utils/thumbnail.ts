import { type BallColorName, ballColorForSlug } from "./ball";
import {
	imageUrl,
	THUMBNAIL_CROPS,
	type Thumbnail,
	type ThumbnailCrop,
} from "./media";

/** 既定のサムネイルのファイル名（拡張子なし）。src/pages/thumbnails/[name].svg.ts が作る */
export function ballThumbnailName({ color }: { color: BallColorName }): string {
	return `ball-${color}`;
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
