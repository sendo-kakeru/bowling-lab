import { describe, expect, test } from "vitest";
import { MEDIA_ORIGIN } from "../../consts.ts";
import { BALL_COLOR_NAMES } from "../svg/ball-svg.ts";
import { candidates, MANIFEST } from "../test-helpers.ts";
import {
	ballColorForSlug,
	ballThumbnailSvg,
	decideThumbnail,
	getThumbnailImage,
	toThumbnailImage,
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
	test("既定の画像は、メディアのいちばん大きな切り抜きと同じ寸法のボールの SVG", () => {
		const fallback = getThumbnailImage({
			slug: "a",
			thumbnail: { source: "default" },
		});
		const media = getThumbnailImage({
			slug: "a",
			thumbnail: {
				image: { height: 1600, key: "images/a.jpg", width: 2400 },
				source: "body",
			},
		});

		expect(fallback).toEqual({
			height: media.height,
			src: "/thumbnails/ball-purple.svg",
			width: media.width,
		});
		expect(ballThumbnailSvg({ color: "purple" })).toContain(
			`width="${media.width}" height="${media.height}"`,
		);
	});
});

describe("toThumbnailImage", () => {
	test("2.2:1 の切り抜きを 224 / 352 / 528 / 768 で出し、src と寸法はいちばん大きな候補", () => {
		const { srcset, ...rest } = toThumbnailImage({
			image: { height: 1600, key: "images/a.jpg", width: 2400 },
		});

		expect(rest).toEqual({
			height: 349,
			src: url("width=768,height=349,fit=cover"),
			width: 768,
		});
		expect(candidates({ srcset })).toEqual([
			"width=224,height=102,fit=cover 224w",
			"width=352,height=160,fit=cover 352w",
			"width=528,height=240,fit=cover 528w",
			"width=768,height=349,fit=cover 768w",
		]);
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
