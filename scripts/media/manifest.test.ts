import { describe, expect, test } from "vitest";
import type { MediaManifest } from "../../src/utils/media-manifest.ts";
import { addEntries, planItems } from "./manifest.ts";

const CAT = {
	height: 1600,
	key: "images/2026/kyoto/cat.a1b2c3.jpg",
	type: "image",
	width: 2400,
} as const;

const MANIFEST: MediaManifest = { "2026/kyoto/cat.jpg": CAT };

const ITEMS = [
	{ logicalPath: "2026/kyoto/cat.jpg" },
	{ logicalPath: "2026/kyoto/dog.jpg" },
];

describe("planItems", () => {
	test("manifest にあるものはスキップする", () => {
		expect(
			planItems({ force: false, items: ITEMS, manifest: MANIFEST }),
		).toEqual({
			process: [{ logicalPath: "2026/kyoto/dog.jpg" }],
			skip: [{ logicalPath: "2026/kyoto/cat.jpg" }],
		});
	});

	test("--force なら manifest にあるものも加工する", () => {
		expect(
			planItems({ force: true, items: ITEMS, manifest: MANIFEST }),
		).toEqual({
			process: ITEMS,
			skip: [],
		});
	});
});

describe("addEntries", () => {
	const DOG = { ...CAT, key: "images/2026/kyoto/dog.d4e5f6.jpg" };

	test("項目を足し、論理パスの順に並べる", () => {
		const next = addEntries({
			entries: [
				{ entry: DOG, logicalPath: "2026/kyoto/dog.jpg" },
				{ entry: DOG, logicalPath: "2025/a.jpg" },
			],
			force: false,
			manifest: MANIFEST,
		});

		expect(Object.keys(next)).toEqual([
			"2025/a.jpg",
			"2026/kyoto/cat.jpg",
			"2026/kyoto/dog.jpg",
		]);
		expect(next["2026/kyoto/dog.jpg"]).toEqual(DOG);
		expect(MANIFEST).toEqual({ "2026/kyoto/cat.jpg": CAT });
	});

	test("--force でなければ、manifest にある論理パスを上書きしない", () => {
		expect(() =>
			addEntries({
				entries: [{ entry: DOG, logicalPath: "2026/kyoto/cat.jpg" }],
				force: false,
				manifest: MANIFEST,
			}),
		).toThrow("--force");
	});

	test("--force なら上書きする", () => {
		expect(
			addEntries({
				entries: [{ entry: DOG, logicalPath: "2026/kyoto/cat.jpg" }],
				force: true,
				manifest: MANIFEST,
			}),
		).toEqual({ "2026/kyoto/cat.jpg": DOG });
	});
});
