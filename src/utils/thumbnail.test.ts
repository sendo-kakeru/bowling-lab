import { describe, expect, test } from "vitest";
import { BALL_COLOR_NAMES } from "./ball-svg.ts";
import { ballColorForSlug } from "./thumbnail.ts";

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
