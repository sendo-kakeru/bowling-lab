import { describe, expect, test } from "vitest";
import { TITLE_STEPS, TITLE_WIDTH } from "./ogp.ts";
import { fitText, type Measure } from "./ogp-text.ts";

/** 和文と全角は 1em、それ以外は 0.5em の幅とみなす。68px なら 1 行に和文 15 字、52px なら 20 字 */
const measure: Measure = ({ text, fontSize }) =>
	[...text].reduce(
		(width, char) => width + (/[　-鿿＀-￯]/u.test(char) ? 1 : 0.5) * fontSize,
		0,
	);

function fitTitle({ title }: { title: string }) {
	return fitText({
		maxWidth: TITLE_WIDTH,
		measure,
		steps: TITLE_STEPS,
		text: title,
	});
}

const kana = ({ length }: { length: number }): string => "あ".repeat(length);

describe("記事のタイトル", () => {
	test("短いタイトルは 68px の 1 行", () => {
		expect(fitTitle({ title: "10番ピンが残る理由" })).toEqual({
			fontSize: 68,
			lineHeight: 96,
			lines: ["10番ピンが残る理由"],
		});
	});

	test("68px でちょうど 2 行なら 68px のまま", () => {
		expect(fitTitle({ title: kana({ length: 30 }) })).toEqual({
			fontSize: 68,
			lineHeight: 96,
			lines: [kana({ length: 15 }), kana({ length: 15 })],
		});
	});

	test("68px で 3 行になるなら 52px に下げる", () => {
		expect(fitTitle({ title: kana({ length: 31 }) })).toEqual({
			fontSize: 52,
			lineHeight: 80,
			lines: [kana({ length: 20 }), kana({ length: 11 })],
		});
	});

	test("52px でちょうど 3 行なら省略しない", () => {
		expect(fitTitle({ title: kana({ length: 60 }) }).lines).toEqual([
			kana({ length: 20 }),
			kana({ length: 20 }),
			kana({ length: 20 }),
		]);
	});

	test("52px で 3 行を超えるなら、3 行目の末尾を「…」で省略する", () => {
		expect(fitTitle({ title: kana({ length: 61 }) })).toEqual({
			fontSize: 52,
			lineHeight: 80,
			lines: [
				kana({ length: 20 }),
				kana({ length: 20 }),
				`${kana({ length: 19 })}…`,
			],
		});
	});

	test("英数字の語は途中で改行しない", () => {
		const { lines } = fitTitle({
			title: "Storm Phaze II と Hyroad Pearl を 3 ゲームずつ投げ比べた",
		});
		expect(lines).toEqual([
			"Storm Phaze II と Hyroad Pearl",
			"を 3 ゲームずつ投げ比べた",
		]);
	});

	test("句読点と閉じかっこは行頭に置かない", () => {
		const { lines } = fitTitle({ title: `${kana({ length: 15 })}」。のこり` });
		expect(lines).toEqual([kana({ length: 14 }), "あ」。のこり"]);
	});

	test("1 語で 1 行を超える英数字は字の途中で分ける", () => {
		const { lines } = fitTitle({ title: "a".repeat(41) });
		expect(lines).toEqual(["a".repeat(30), "a".repeat(11)]);
	});
});
