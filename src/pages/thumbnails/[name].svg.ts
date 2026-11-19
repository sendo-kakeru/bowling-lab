import type { APIRoute, GetStaticPaths } from "astro";
import {
	BALL_COLOR_NAMES,
	type BallColorName,
	ballSvg,
} from "../../utils/ball";
import { THUMBNAIL_CROPS } from "../../utils/media";
import { ballThumbnailName } from "../../utils/thumbnail";

/*
  既定のサムネイル。色ごとに 1 枚、ビルド時に作る。
  カードの切り抜きと同じ大きさにし、object-fit: cover でどの枠に切り抜かれてもボールが欠けないよう中央に置く
*/

export const getStaticPaths = (() =>
	BALL_COLOR_NAMES.map((color) => ({
		params: { name: ballThumbnailName({ color }) },
		props: { color },
	}))) satisfies GetStaticPaths;

export const GET: APIRoute<{ color: BallColorName }> = ({ props }) => {
	const { width, height } = THUMBNAIL_CROPS.card;
	const ball = ballSvg({
		color: props.color,
		cx: width / 2,
		cy: height / 2,
		r: height * 0.4,
	});
	const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}"><rect width="${width}" height="${height}" fill="#efe4d0"/>${ball}</svg>`;
	return new Response(svg, {
		headers: { "Content-Type": "image/svg+xml" },
	});
};
