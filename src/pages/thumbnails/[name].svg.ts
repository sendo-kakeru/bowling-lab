import type { APIRoute, GetStaticPaths } from "astro";
import { BALL_COLOR_NAMES, type BallColorName } from "../../utils/ball";
import { ballThumbnailName, ballThumbnailSvg } from "../../utils/thumbnail";

export const getStaticPaths = (() =>
	BALL_COLOR_NAMES.map((color) => ({
		params: { name: ballThumbnailName({ color }) },
		props: { color },
	}))) satisfies GetStaticPaths;

export const GET: APIRoute<{ color: BallColorName }> = ({ props }) =>
	new Response(ballThumbnailSvg({ color: props.color }), {
		headers: { "Content-Type": "image/svg+xml" },
	});
