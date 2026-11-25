import { describe, expect, test } from "vitest";
import { catchMemoParseError } from "../test-helpers.ts";
import {
	compareMemos,
	type Memo,
	resolveMemoFrontmatter,
	resolvePostedAt,
} from "./memo-schema.ts";
import { type MemoParseError, parseMemo } from "./parse-memo.ts";

/** 見出しの日時の並びから、メモの本文を作って読む。空の meta エリアが 1、2 行目 */
function resolve(...postedAts: string[]): ReturnType<typeof resolvePostedAt> {
	const source = `---\n---\n${postedAts
		.map((postedAt) => `## ${postedAt}\n\n本文\n`)
		.join("\n")}`;
	return resolvePostedAt({ notes: parseMemo({ source }).notes });
}

/** resolve が投げた MemoParseError を取り出す */
function catchResolveError(...postedAts: string[]): MemoParseError {
	return catchMemoParseError({ run: () => resolve(...postedAts) });
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

		expect(second).toMatchObject({ line: 7, markdown: "本文" });
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

		expect(error.line).toBe(7);
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

		expect(error.line).toBe(11);
		expect(error.message).toContain("前の書き込み");
	});
});

describe("resolveMemoFrontmatter", () => {
	test.each([
		[{ pinned: true }, true],
		[{ pinned: false }, false],
		[{}, false],
	])("%o は pinned: %s", (frontmatter, pinned) => {
		expect(resolveMemoFrontmatter({ frontmatter })).toEqual({ pinned });
	});

	test("知らない項目は、書ける項目を添えて 1 行目でエラー", () => {
		const error = catchMemoParseError({
			run: () => resolveMemoFrontmatter({ frontmatter: { pined: true } }),
		});

		expect(error.line).toBe(1);
		expect(error.message).toBe('知らない項目 "pined"。書けるのは pinned');
	});

	test.each(["true", 1, null])(
		"pinned が真偽値でない %o は 1 行目でエラー",
		(pinned) => {
			const error = catchMemoParseError({
				run: () => resolveMemoFrontmatter({ frontmatter: { pinned } }),
			});

			expect(error.line).toBe(1);
			expect(error.message).toContain("pinned は true か false");
		},
	);
});

describe("compareMemos", () => {
	const toNote = (postedAt: string): Memo["notes"][number] => ({
		html: "",
		postedAt: new Date(postedAt),
	});
	const memo = (id: string, first: string, ...rest: string[]): Memo => ({
		id,
		notes: [toNote(first), ...rest.map(toNote)] satisfies [
			unknown,
			...unknown[],
		],
		pinned: false,
	});

	test("先頭の書き込みの新しい順。続きの日時は見ない", () => {
		const old = memo("old", "2026-11-01T00:00:00Z", "2026-11-30T00:00:00Z");
		const recent = memo("recent", "2026-11-10T00:00:00Z");

		expect([old, recent].toSorted(compareMemos).map(({ id }) => id)).toEqual([
			"recent",
			"old",
		]);
	});

	test("同じ分なら、-2 つきのファイルが前に来る", () => {
		const first = memo("2026-11-06-2114", "2026-11-06T12:14:00Z");
		const second = memo("2026-11-06-2114-2", "2026-11-06T12:14:00Z");

		expect([first, second].toSorted(compareMemos).map(({ id }) => id)).toEqual([
			"2026-11-06-2114-2",
			"2026-11-06-2114",
		]);
	});

	test("ピン留めしたメモが先。その中と残りは、それぞれ先頭の書き込みの新しい順", () => {
		const pin = (target: Memo): Memo => ({ ...target, pinned: true });
		const memos = [
			memo("new", "2026-11-20T00:00:00Z"),
			pin(memo("old-pin", "2026-11-01T00:00:00Z")),
			memo("old", "2026-11-02T00:00:00Z"),
			pin(memo("new-pin", "2026-11-10T00:00:00Z")),
		];

		expect(memos.toSorted(compareMemos).map(({ id }) => id)).toEqual([
			"new-pin",
			"old-pin",
			"new",
			"old",
		]);
	});
});
