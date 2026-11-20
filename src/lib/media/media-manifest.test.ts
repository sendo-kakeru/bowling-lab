import { describe, expect, test } from "vitest";
import {
	CAT_IMAGE as IMAGE,
	MANIFEST,
	WALK_VIDEO as VIDEO,
} from "../test-helpers.ts";
import { getMediaManifest, parseMediaManifest } from "./media-manifest.ts";

describe("parseMediaManifest", () => {
	test("画像と動画の項目を受け付ける", () => {
		expect(parseMediaManifest({ data: MANIFEST })).toEqual(MANIFEST);
	});

	test("空の manifest を受け付ける", () => {
		expect(parseMediaManifest({ data: {} })).toEqual({});
	});

	test.each([
		["type が image でも video でもない", { ...IMAGE, type: "audio" }],
		["画像に幅がない", { height: 1600, key: IMAGE.key, type: "image" }],
		["幅が 0", { ...IMAGE, width: 0 }],
		["幅が整数でない", { ...IMAGE, width: 2400.5 }],
		["画像のキーが images/ で始まらない", { ...IMAGE, key: "cat.jpg" }],
		["動画のキーが videos/ で始まらない", { ...VIDEO, key: IMAGE.key }],
		["動画にポスター画像がない", { ...VIDEO, poster: undefined }],
		[
			"ポスター画像のキーが images/ で始まらない",
			{ ...VIDEO, poster: VIDEO.key },
		],
		["動画の長さが負", { ...VIDEO, duration: -1 }],
	])("%s ならエラー", (_, entry) => {
		expect(() =>
			parseMediaManifest({ data: { "2026/kyoto/cat.jpg": entry } }),
		).toThrow("media-manifest.json");
	});

	test("オブジェクトでなければエラー", () => {
		expect(() => parseMediaManifest({ data: [] })).toThrow(
			"media-manifest.json",
		);
	});

	test("エラーに、どの項目が違うかを含める", () => {
		expect(() =>
			parseMediaManifest({
				data: { "2026/kyoto/cat.jpg": { ...IMAGE, width: 0 } },
			}),
		).toThrow("2026/kyoto/cat.jpg.width");
	});
});

describe("getMediaManifest", () => {
	test("リポジトリの manifest が正しい形をしている", () => {
		expect(() => getMediaManifest()).not.toThrow();
	});
});
