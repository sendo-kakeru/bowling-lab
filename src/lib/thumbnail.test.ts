import { describe, expect, test } from "vitest";
import { BALL_COLOR_NAMES } from "./ball-svg.ts";
import {
	ballColorForSlug,
	ballThumbnailSvg,
	getThumbnailImage,
} from "./thumbnail.ts";

describe("ballColorForSlug", () => {
	test("同じスラッグはいつも同じ色になる", () => {
		expect(ballColorForSlug({ slug: "oil-transition" })).toBe(
			ballColorForSlug({ slug: "oil-transition" }),
		);
	});

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
