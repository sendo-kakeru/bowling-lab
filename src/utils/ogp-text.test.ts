import { describe, expect, test } from "vitest";
import { TITLE_STEPS } from "./ogp.ts";
import { fitText, type Measure } from "./ogp-text.ts";

/**
 * 和文と全角は 1em、それ以外は 0.5em の幅とみなす。幅 1040px の行に和文が 84px で 12 字、68px で 15 字、52px で 20 字入る。
 * 52px の 4 行目はボールの左端の手前（x=969）までの 889px で、17 字入る
 */
const measure: Measure = ({ text, fontSize }) =>
	[...text].reduce(
		(width, char) => width + (/[　-鿿＀-￯]/u.test(char) ? 1 : 0.5) * fontSize,
		0,
	);

function fitTitle({ title }: { title: string }) {
	return fitText({
		measure,
		steps: TITLE_STEPS,
		text: title,
	});
}

const kana = ({ length }: { length: number }): string => "あ".repeat(length);

describe("記事のタイトル", () => {
	test("1 行に収まる短いタイトルは 84px", () => {
		expect(fitTitle({ title: "10番ピンが残る理由" })).toEqual({
			fontSize: 84,
			lineHeight: 112,
			lines: ["10番ピンが残る理由"],
		});
	});

	test("84px で 1 行に収まらなければ 68px", () => {
		expect(fitTitle({ title: kana({ length: 13 }) })).toEqual({
			fontSize: 68,
			lineHeight: 96,
			lines: [kana({ length: 13 })],
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

	test("52px の 4 行目はボールの手前までの幅で組む", () => {
		expect(fitTitle({ title: kana({ length: 77 }) }).lines).toEqual([
			kana({ length: 20 }),
			kana({ length: 20 }),
			kana({ length: 20 }),
			kana({ length: 17 }),
		]);
	});

	test("52px で 4 行を超えるなら、4 行目の末尾を「…」で省略する", () => {
		expect(fitTitle({ title: kana({ length: 78 }) })).toEqual({
			fontSize: 52,
			lineHeight: 80,
			lines: [
				kana({ length: 20 }),
				kana({ length: 20 }),
				kana({ length: 20 }),
				`${kana({ length: 16 })}…`,
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
			"Storm Phaze II と Hyroad Pearl",
			"を 3 ゲームずつ投げ比べた",
		]);
	});

	test("開きかっこは行末に置かない", () => {
		const { lines } = fitTitle({ title: `${kana({ length: 14 })}「あ」` });
		expect(lines).toEqual([kana({ length: 14 }), "「あ」"]);
	});

	test("全角の空白は和文の 1 字として残す", () => {
		const { lines } = fitTitle({ title: "ボウリング　第1回" });
		expect(lines).toEqual(["ボウリング　第1回"]);
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
