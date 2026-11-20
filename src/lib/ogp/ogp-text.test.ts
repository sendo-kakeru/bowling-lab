import { describe, expect, test } from "vitest";
import { TITLE_STEPS } from "./ogp.ts";
import { type FittedText, fitText, type Measure } from "./ogp-text.ts";

/**
 * 和文と全角は 1em、それ以外は 0.5em の幅とみなす。幅 1040px の行に和文が 96px で 10 字、76px で 13 字、60px で 17 字入る。
 * 60px の 4 行目はボールの左端の手前（x=934）までの 854px で、14 字入る
 */
const measure: Measure = ({ text, fontSize }) =>
	[...text].reduce(
		(width, char) => width + (/[　-鿿＀-￯]/u.test(char) ? 1 : 0.5) * fontSize,
		0,
	);

function fitTitle({ title }: { title: string }): FittedText {
	return fitText({
		measure,
		steps: TITLE_STEPS,
		text: title,
	});
}

const kana = ({ length }: { length: number }): string => "あ".repeat(length);

describe("記事のタイトル", () => {
	test("1 行に収まる短いタイトルは 96px", () => {
		expect(fitTitle({ title: "10番ピンが残る理由" })).toEqual({
			fontSize: 96,
			lineHeight: 124,
			lines: ["10番ピンが残る理由"],
		});
	});

	test("96px で 1 行に収まらなければ 76px", () => {
		expect(fitTitle({ title: kana({ length: 11 }) })).toEqual({
			fontSize: 76,
			lineHeight: 104,
			lines: [kana({ length: 11 })],
		});
	});

	test("76px でちょうど 2 行なら 76px のまま", () => {
		expect(fitTitle({ title: kana({ length: 26 }) })).toEqual({
			fontSize: 76,
			lineHeight: 104,
			lines: [kana({ length: 13 }), kana({ length: 13 })],
		});
	});

	test("76px で 3 行になるなら 60px に下げる", () => {
		expect(fitTitle({ title: kana({ length: 27 }) })).toEqual({
			fontSize: 60,
			lineHeight: 86,
			lines: [kana({ length: 17 }), kana({ length: 10 })],
		});
	});

	test("60px の 4 行目はボールの手前までの幅で組む", () => {
		expect(fitTitle({ title: kana({ length: 65 }) }).lines).toEqual([
			kana({ length: 17 }),
			kana({ length: 17 }),
			kana({ length: 17 }),
			kana({ length: 14 }),
		]);
	});

	test("60px で 4 行を超えるなら、4 行目の末尾を「…」で省略する", () => {
		expect(fitTitle({ title: kana({ length: 66 }) })).toEqual({
			fontSize: 60,
			lineHeight: 86,
			lines: [
				kana({ length: 17 }),
				kana({ length: 17 }),
				kana({ length: 17 }),
				`${kana({ length: 13 })}…`,
			],
		});
	});

	test("英数字の語は途中で改行しない", () => {
		const { lines } = fitTitle({ title: `${kana({ length: 13 })} Storm` });
		expect(lines).toEqual([kana({ length: 13 }), "Storm"]);
	});

	test("英数字の混ざったタイトルは空白で改行する", () => {
		const { lines } = fitTitle({
			title: "Storm Phaze II と Hyroad Pearl を 3 ゲームずつ投げ比べた",
		});
		expect(lines).toEqual([
			"Storm Phaze II と Hyroad Pearl を",
			"3 ゲームずつ投げ比べた",
		]);
	});

	test("開きかっこは行末に置かない", () => {
		const { lines } = fitTitle({ title: `${kana({ length: 11 })}「あ」` });
		expect(lines).toEqual([kana({ length: 11 }), "「あ」"]);
	});

	test("全角の空白は和文の 1 字として残す", () => {
		const { lines } = fitTitle({ title: "ボウリング　第1回" });
		expect(lines).toEqual(["ボウリング　第1回"]);
	});

	test("句読点と閉じかっこは行頭に置かない", () => {
		const { lines } = fitTitle({ title: `${kana({ length: 13 })}」。のこり` });
		expect(lines).toEqual([kana({ length: 12 }), "あ」。のこり"]);
	});

	test("1 語で 1 行を超える英数字は字の途中で分ける", () => {
		const { lines } = fitTitle({ title: "a".repeat(41) });
		expect(lines).toEqual(["a".repeat(27), "a".repeat(14)]);
	});
});
