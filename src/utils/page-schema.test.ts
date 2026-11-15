import { describe, expect, test } from "vitest";
import { parsePageData } from "./page-schema.ts";

const ABOUT = {
	bowler: {
		ball: "仮のボール名",
		hand: "右投げ",
		homeCenter: "仮のセンター名",
		name: "sendo-kakeru",
		style: "1ハンド",
	},
	title: "About",
};

describe("parsePageData", () => {
	test("About のフロントマターを受け付ける", () => {
		expect(parsePageData({ data: ABOUT, id: "about" })).toEqual(ABOUT);
	});

	test("名前がないと、ファイルと項目を添えて投げる", () => {
		const { name: _, ...bowler } = ABOUT.bowler;

		expect(() =>
			parsePageData({ data: { ...ABOUT, bowler }, id: "about" }),
		).toThrow(
			/src\/content\/pages\/about\.md のフロントマターが正しくない\nbowler\.name: /,
		);
	});

	test("投げ方は 右投げ か 左投げ だけ", () => {
		const bowler = { ...ABOUT.bowler, hand: "両手" };

		expect(() =>
			parsePageData({ data: { ...ABOUT, bowler }, id: "about" }),
		).toThrow(/bowler\.hand: /);
	});

	test("BOWLER CARD の項目がまるごとないと投げる", () => {
		expect(() =>
			parsePageData({ data: { title: "About" }, id: "about" }),
		).toThrow(/bowler: /);
	});

	test("プライバシーポリシーに題名がないと投げる", () => {
		expect(() => parsePageData({ data: {}, id: "privacy" })).toThrow(
			/src\/content\/pages\/privacy\.md のフロントマターが正しくない\ntitle: /,
		);
	});
});
