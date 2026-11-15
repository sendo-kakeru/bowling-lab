import { describe, expect, test } from "vitest";
import { parsePageData } from "./page-schema.ts";

describe("parsePageData", () => {
	test("題名を受け付ける", () => {
		expect(parsePageData({ data: { title: "About" }, id: "about" })).toEqual({
			title: "About",
		});
	});

	test("題名がないと、ファイルと項目を添えて投げる", () => {
		expect(() => parsePageData({ data: {}, id: "privacy" })).toThrow(
			"src/content/pages/privacy.md のフロントマターが正しくない\ntitle: フロントマターには title だけを書く",
		);
	});

	test("空白だけの題名は空とみなす", () => {
		expect(() => parsePageData({ data: { title: " " }, id: "about" })).toThrow(
			"title: 空にしない",
		);
	});

	test("YAML で数値になる題名は投げる", () => {
		expect(() => parsePageData({ data: { title: 2026 }, id: "about" })).toThrow(
			"title: 文字列で書く",
		);
	});

	test("知らない項目は書き間違いとして投げる", () => {
		expect(() =>
			parsePageData({ data: { tilte: "About", title: "About" }, id: "about" }),
		).toThrow("tilte: フロントマターには title だけを書く");
	});
});
