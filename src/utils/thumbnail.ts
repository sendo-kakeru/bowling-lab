import { getImage } from "astro:assets";
import defaultThumbnail from "../assets/default-thumbnail.jpg";
import {
	imageUrl,
	THUMBNAIL_CROPS,
	type Thumbnail,
	type ThumbnailCrop,
} from "./media";

/**
 * サムネイルの切り抜きの URL。メディアは変換配信の URL（絶対）、既定の画像はサイト内の相対 URL を返す。
 * OGP などで絶対 URL が要るときは `new URL(url, Astro.site)` で直す
 */
export async function getThumbnailUrl({
	thumbnail,
	crop,
}: {
	thumbnail: Thumbnail;
	crop: ThumbnailCrop;
}): Promise<string> {
	const { width, height } = THUMBNAIL_CROPS[crop];
	if (thumbnail.source !== "default") {
		return imageUrl({ height, key: thumbnail.image.key, width });
	}
	const { src } = await getImage({
		fit: "cover",
		height,
		src: defaultThumbnail,
		width,
	});
	return src;
}
