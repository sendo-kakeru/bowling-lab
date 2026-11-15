import { describe, expect, test } from "vitest";
import { resolvePostedAt } from "./memo-schema.ts";
import { MemoParseError, parseMemo } from "./parse-memo.ts";

/** 見出しの日時の並びから、メモの本文を作って読む */
function resolve(...postedAts: string[]): ReturnType<typeof resolvePostedAt> {
	const source = postedAts
		.map((postedAt) => `## ${postedAt}\n\n本文\n`)
		.join("\n");
	return resolvePostedAt({ notes: parseMemo({ source }) });
}

/** 投げられた MemoParseError を取り出す */
function catchResolveError(...postedAts: string[]): MemoParseError {
	try {
		resolve(...postedAts);
	} catch (error) {
		if (error instanceof MemoParseError) return error;
		throw error;
	}
	throw new Error("MemoParseError が投げられなかった");
}

describe("resolvePostedAt", () => {
	test("見出しの日時を日本時間の Date にする", () => {
		const [note] = resolve("2026-11-06 21:14");

		expect(note?.postedAt.toISOString()).toBe("2026-11-06T12:14:00.000Z");
	});

	test("日本時間の 0 時台は、UTC の前の日になる", () => {
		const [note] = resolve("2026-01-01 00:30");

		expect(note?.postedAt.toISOString()).toBe("2025-12-31T15:30:00.000Z");
	});

	test("本文と行番号はそのまま残す", () => {
		const [, second] = resolve("2026-11-06 21:14", "2026-11-06 21:38");

		expect(second).toMatchObject({ line: 5, markdown: "本文" });
	});

	test("同じ分の書き込みは許す", () => {
		expect(resolve("2026-11-06 21:14", "2026-11-06 21:14")).toHaveLength(2);
	});

	test.each([
		"2026-13-40 00:00",
		"2026-02-30 12:00",
		"2025-02-29 12:00",
		"2026-11-06 24:00",
		"2026-11-06 21:60",
	])("存在しない日時 %s は、その見出しの行番号でエラー", (postedAt) => {
		const error = catchResolveError("2026-01-01 00:00", postedAt);

		expect(error.line).toBe(5);
		expect(error.message).toContain("存在しない日時");
	});

	test("うるう年の 2 月 29 日は存在する", () => {
		const [note] = resolve("2028-02-29 12:00");

		expect(note?.postedAt.toISOString()).toBe("2028-02-29T03:00:00.000Z");
	});

	test("前の書き込みより古い日時は、その見出しの行番号でエラー", () => {
		const error = catchResolveError(
			"2026-11-06 21:14",
			"2026-11-06 21:38",
			"2026-11-06 21:37",
		);

		expect(error.line).toBe(9);
		expect(error.message).toContain("前の書き込み");
	});
});
