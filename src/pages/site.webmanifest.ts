import type { APIRoute } from "astro";
import {
	SITE_LANG,
	SITE_SHORT_TITLE,
	SITE_TITLE,
	THEME_COLOR,
} from "../consts";

/*
  Android でホーム画面に追加したときの名前とアイコン。
  アイコンは印の角がマスクの安全領域からはみ出すので maskable にしない。
  ブログなので、ホーム画面から開いてもブラウザのまま（戻るボタンと URL バーを残す）
*/
export const GET: APIRoute = () =>
	Response.json({
		background_color: "#ffffff",
		display: "browser",
		icons: [192, 512].map((size) => ({
			sizes: `${size}x${size}`,
			src: `/web-app-manifest-${size}x${size}.png`,
			type: "image/png",
		})),
		lang: SITE_LANG,
		name: SITE_TITLE,
		short_name: SITE_SHORT_TITLE,
		start_url: "/",
		theme_color: THEME_COLOR,
	});
