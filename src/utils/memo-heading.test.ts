import { describe, expect, test } from "vitest";
import { formatMemoHeading, matchMemoHeading } from "./memo-heading.ts";

describe("formatMemoHeading", () => {
	test("日本時間の 年-月-日 時:分 で見出しを作る", () => {
		expect(formatMemoHeading({ date: new Date("2026-11-06T12:14:00Z") })).toBe(
			"## 2026-11-06 21:14",
		);
	});

	test("UTC では前の日でも、日本時間の日付になる", () => {
		expect(formatMemoHeading({ date: new Date("2026-11-05T15:05:00Z") })).toBe(
			"## 2026-11-06 00:05",
		);
	});

	test("作った見出しは、見出しとして読める", () => {
		const line = formatMemoHeading({ date: new Date("2026-01-02T03:04:00Z") });

		expect(matchMemoHeading({ line })).toBe("2026-01-02 12:04");
	});
});

describe("matchMemoHeading", () => {
	test("見出しの行から日時を取り出す", () => {
		expect(matchMemoHeading({ line: "## 2026-11-06 21:14" })).toBe(
			"2026-11-06 21:14",
		);
	});

	test("行末の空白は許す", () => {
		expect(matchMemoHeading({ line: "## 2026-11-06 21:14  " })).toBe(
			"2026-11-06 21:14",
		);
	});

	test.each([
		"## 2026-11-6 21:14",
		"### 2026-11-06 21:14",
		"##2026-11-06 21:14",
		" ## 2026-11-06 21:14",
		"## 2026-11-06 21:14 練習",
		"## 練習の記録",
	])("%s は見出しではない", (line) => {
		expect(matchMemoHeading({ line })).toBeUndefined();
	});
});
