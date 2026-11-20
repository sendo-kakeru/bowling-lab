import { describe, expect, test } from "vitest";
import { MEDIA_ORIGIN } from "../../consts.ts";
import { BALL_COLOR_NAMES } from "../svg/ball-svg.ts";
import { MANIFEST } from "../test-helpers.ts";
import {
	ballColorForSlug,
	ballThumbnailSvg,
	decideThumbnail,
	getThumbnailImage,
} from "./thumbnail.ts";

const url = (options: string): string =>
	`${MEDIA_ORIGIN}/cdn-cgi/image/${options},format=auto/images/a.jpg`;

describe("ballColorForSlug", () => {
	test("6 色すべてが選ばれうる", () => {
		const colors = new Set(
			Array.from({ length: 100 }, (_, i) =>
				ballColorForSlug({ slug: `post-${i}` }),
			),
		);

		expect([...colors].sort()).toEqual([...BALL_COLOR_NAMES].sort());
	});

	test("FNV-1a（32 ビット）を 6 で割った余りで表の順に選ぶ", () => {
		// FNV-1a("a") = 0xe40c292c、6 で割った余りは 4
		expect(ballColorForSlug({ slug: "a" })).toBe("purple");
	});

	test("スラッグを UTF-8 のバイト列として扱う", () => {
		// FNV-1a("é") = 0x1e9de8c1（UTF-8 の c3 a9 から）、6 で割った余りは 3
		expect(ballColorForSlug({ slug: "é" })).toBe("yellow");
	});
});

describe("getThumbnailImage", () => {
	const cropsOf = ({ width, height }: { width: number; height: number }) => {
		const image = getThumbnailImage({
			slug: "a",
			thumbnail: {
				image: { height, key: "images/a.jpg", width },
				source: "body",
			},
		});
		if (image.kind !== "crops") throw new Error("切り抜きになっていない");
		return image.crops;
	};

	test("既定の画像は、タイルと同じ 768 × 349 のボールの SVG", () => {
		expect(
			getThumbnailImage({ slug: "a", thumbnail: { source: "default" } }),
		).toEqual({
			height: 349,
			kind: "default",
			src: "/thumbnails/ball-purple.svg",
			width: 768,
		});
		expect(ballThumbnailSvg({ color: "purple" })).toContain(
			'width="768" height="349"',
		);
	});

	test("スマホの 96px 角の枠は 1:1 を 3x の 288 で出す", () => {
		expect(cropsOf({ height: 1600, width: 2400 }).square.src).toBe(
			url("width=288,height=288,fit=cover"),
		);
	});

	test("一覧の 200 × 120px の枠は 5:3 を 2x の 400 で出す", () => {
		expect(cropsOf({ height: 1600, width: 2400 }).row.src).toBe(
			url("width=400,height=240,fit=cover"),
		);
	});

	test("タイルは 2.2:1 を、いちばん広い枠の 2x の 768 で出す", () => {
		expect(cropsOf({ height: 1600, width: 2400 }).tile).toMatchObject({
			height: 349,
			src: url("width=768,height=349,fit=cover"),
			width: 768,
		});
	});

	test("マスターより大きく切り抜かない", () => {
		const small = cropsOf({ height: 200, width: 300 });

		expect(small.square.src).toBe(url("width=200,height=200,fit=cover"));
		expect(small.tile.src).toBe(url("width=300,height=136,fit=cover"));
	});
});

describe("decideThumbnail", () => {
	const CAT = {
		height: 1600,
		key: "images/2026/kyoto/cat.a1b2c3.jpg",
		width: 2400,
	};

	test("フロントマターの thumbnail を本文の画像より優先する", () => {
		expect(
			decideThumbnail({
				manifest: MANIFEST,
				markdown: "![](media:2026/kyoto/walk.mov)",
				thumbnail: "2026/kyoto/cat.jpg",
			}),
		).toEqual({ image: CAT, source: "frontmatter" });
	});

	test("thumbnail がなければ、本文で最初の media: の画像", () => {
		expect(
			decideThumbnail({
				manifest: MANIFEST,
				markdown:
					"本文\n\n![外部](https://example.com/a.png)\n\n![猫](media:2026/kyoto/cat.jpg)",
			}),
		).toEqual({ image: CAT, source: "body" });
	});

	test("本文の最初が動画なら、ポスター画像に動画の寸法を付ける", () => {
		expect(
			decideThumbnail({
				manifest: MANIFEST,
				markdown:
					"![](media:2026/kyoto/walk.mov)\n\n![](media:2026/kyoto/cat.jpg)",
			}),
		).toEqual({
			image: {
				height: 1080,
				key: "images/2026/kyoto/walk.d4e5f6.poster.jpg",
				width: 1920,
			},
			source: "body",
		});
	});

	test("どちらもなければ既定の画像", () => {
		expect(
			decideThumbnail({ manifest: MANIFEST, markdown: "画像のない本文" }),
		).toEqual({ source: "default" });
	});

	test("manifest にない thumbnail は、参照を添えて投げる", () => {
		expect(() =>
			decideThumbnail({
				manifest: MANIFEST,
				markdown: "",
				thumbnail: "2026/nope/x.jpg",
			}),
		).toThrow("media:2026/nope/x.jpg");
	});

	test("manifest にない本文の最初の参照も、既定の画像にせず投げる", () => {
		expect(() =>
			decideThumbnail({
				manifest: MANIFEST,
				markdown: "![](media:2026/nope/x.jpg)",
			}),
		).toThrow("media:2026/nope/x.jpg");
	});
});
