import { describe, expect, test } from "vitest";
import { parseMemo, parseMemoSections } from "../../src/lib/parse-memo.ts";
import {
	formatMemoId,
	type MemoChange,
	type MemoFile,
	planAddNote,
	planNewMemo,
} from "./memo-plan.ts";

// UTC では 11 月 15 日だが、日本時間では 11 月 16 日 0 時 20 分。時間帯の指定が漏れると日付がずれる
const NOW = new Date("2026-11-15T15:20:00Z");
const NOW_ID = "2026-11-16-0020";
const NOW_HEADING = "## 2026-11-16 00:20";

function memo(id: string, ...lines: string[]): MemoFile {
	return { id, source: lines.join("\n") };
}

/** 書いた本文をローダーと同じ関数で読み戻し、見出しの日時と本文を返す */
function readBack({ change }: { change: MemoChange }): {
	sections: { postedAt: string; markdown: string }[];
	notes: number;
} {
	return {
		notes: parseMemo({ source: change.source }).length,
		sections: parseMemoSections({ source: change.source }).map(
			({ markdown, postedAt }) => ({ markdown, postedAt }),
		),
	};
}

describe("formatMemoId", () => {
	test("日本時間の年月日と時分", () => {
		expect(formatMemoId({ date: NOW })).toBe(NOW_ID);
	});
});

describe("planNewMemo", () => {
	test("今の日時の名前で、見出しだけのメモを作る", () => {
		const change = planNewMemo({
			memos: [memo("2026-11-14-2100", "## 2026-11-14 21:00", "", "本文")],
			now: NOW,
		});

		expect(change).toEqual({
			id: NOW_ID,
			kind: "create",
			source: `${NOW_HEADING}\n\n`,
		});
		expect(readBack({ change })).toEqual({
			notes: 0,
			sections: [{ markdown: "", postedAt: "2026-11-16 00:20" }],
		});
	});

	test("メモが 1 つもなくても作る", () => {
		expect(planNewMemo({ memos: [], now: NOW })).toEqual({
			id: NOW_ID,
			kind: "create",
			source: `${NOW_HEADING}\n\n`,
		});
	});

	test("同じ分のファイルがあれば -2、-3 と番号を付ける", () => {
		const written = memo(NOW_ID, NOW_HEADING, "", "本文");

		expect(planNewMemo({ memos: [written], now: NOW }).id).toBe(`${NOW_ID}-2`);
		expect(
			planNewMemo({
				memos: [written, memo(`${NOW_ID}-2`, NOW_HEADING, "", "続き")],
				now: NOW,
			}).id,
		).toBe(`${NOW_ID}-3`);
	});

	describe("空のメモの作り直し", () => {
		test("いちばん新しいメモが見出しだけなら、見出しとファイル名を今に直す", () => {
			const change = planNewMemo({
				memos: [
					memo("2026-11-14-2100", "## 2026-11-14 21:00", "", "本文"),
					memo("2026-11-15-1020", "## 2026-11-15 10:20", ""),
				],
				now: NOW,
			});

			expect(change).toEqual({
				fromId: "2026-11-15-1020",
				id: NOW_ID,
				kind: "rename",
				source: `${NOW_HEADING}\n\n`,
			});
			expect(readBack({ change }).sections).toEqual([
				{ markdown: "", postedAt: "2026-11-16 00:20" },
			]);
		});

		test("ファイル名が今と同じなら、名前は変えずに書き直す", () => {
			expect(
				planNewMemo({ memos: [memo(NOW_ID, NOW_HEADING)], now: NOW }),
			).toEqual({ id: NOW_ID, kind: "update", source: `${NOW_HEADING}\n\n` });
		});

		test("ほかのファイルが今の名前を使っていれば、番号を付けて移す", () => {
			const change = planNewMemo({
				memos: [
					memo(NOW_ID, "## 2026-11-14 09:00", "", "古い日時で作ったメモ"),
					memo("2026-11-15-1020", "## 2026-11-15 10:20", ""),
				],
				now: NOW,
			});

			expect(change).toMatchObject({
				fromId: "2026-11-15-1020",
				id: `${NOW_ID}-2`,
				kind: "rename",
			});
		});

		test("文のあるメモは作り直さず、新しく作る", () => {
			const change = planNewMemo({
				memos: [memo("2026-11-15-1020", "## 2026-11-15 10:20", "", "本文")],
				now: NOW,
			});

			expect(change).toMatchObject({ id: NOW_ID, kind: "create" });
		});

		test("末尾だけが空でも見出しが 2 つあれば、新しく作る", () => {
			const change = planNewMemo({
				memos: [
					memo(
						"2026-11-15-1020",
						"## 2026-11-15 10:20",
						"本文",
						"",
						"## 2026-11-15 11:00",
						"",
					),
				],
				now: NOW,
			});

			expect(change.kind).toBe("create");
		});
	});

	test("いちばん新しいメモは、ファイル名ではなく先頭の見出しの日時で決める", () => {
		const change = planNewMemo({
			memos: [
				memo("2026-11-15-1020", "## 2026-11-15 10:20", ""),
				memo("2026-11-01-0900", "## 2026-11-15 12:00", "", "本文"),
			],
			now: NOW,
		});

		expect(change.kind).toBe("create");
	});

	test("書式の誤りは、ファイルのパスと行番号つきで投げる", () => {
		expect(() =>
			planNewMemo({
				memos: [memo("2026-11-15-1020", "前置き", "## 2026-11-15 10:20")],
				now: NOW,
			}),
		).toThrow("src/content/memos/2026-11-15-1020.md:1 ");
	});
});

describe("planAddNote", () => {
	const older = memo("2026-11-14-2100", "## 2026-11-14 21:00", "", "前の日");
	const newest = memo(
		"2026-11-15-1020",
		"## 2026-11-15 10:20",
		"",
		"10番ピンだけ残る。",
		"",
		"",
	);

	test("いちばん新しいメモの末尾に、今の日時の見出しを足す", () => {
		const change = planAddNote({ memos: [newest, older], now: NOW });

		expect(change).toEqual({
			id: "2026-11-15-1020",
			kind: "update",
			source: `## 2026-11-15 10:20\n\n10番ピンだけ残る。\n\n${NOW_HEADING}\n\n`,
		});
		expect(readBack({ change })).toEqual({
			notes: 1,
			sections: [
				{ markdown: "10番ピンだけ残る。", postedAt: "2026-11-15 10:20" },
				{ markdown: "", postedAt: "2026-11-16 00:20" },
			],
		});
	});

	test("末尾の見出しの下が空なら、足さずにその日時を今に書き換える", () => {
		const change = planAddNote({
			memos: [
				memo(
					"2026-11-15-1020",
					"## 2026-11-15 10:20",
					"",
					"本文",
					"",
					"## 2026-11-15 11:00",
					"",
					"",
				),
			],
			now: NOW,
		});

		expect(change.source).toBe(
			`## 2026-11-15 10:20\n\n本文\n\n${NOW_HEADING}\n\n`,
		);
		expect(readBack({ change }).sections).toEqual([
			{ markdown: "本文", postedAt: "2026-11-15 10:20" },
			{ markdown: "", postedAt: "2026-11-16 00:20" },
		]);
	});

	test("見出しだけのメモは、その見出しの日時を書き換える（ファイル名は変えない）", () => {
		expect(
			planAddNote({
				memos: [memo("2026-11-15-1020", "## 2026-11-15 10:20", "")],
				now: NOW,
			}),
		).toEqual({
			id: "2026-11-15-1020",
			kind: "update",
			source: `${NOW_HEADING}\n\n`,
		});
	});

	test.each([
		"2026-11-14-2100",
		"2026-11-14-2100.md",
		"src/content/memos/2026-11-14-2100.md",
	])("id を指定すると、そのメモに足す: %s", (id) => {
		const change = planAddNote({ id, memos: [newest, older], now: NOW });

		expect(change).toEqual({
			id: "2026-11-14-2100",
			kind: "update",
			source: `## 2026-11-14 21:00\n\n前の日\n\n${NOW_HEADING}\n\n`,
		});
	});

	test("存在しない id はエラー", () => {
		expect(() =>
			planAddNote({ id: "2026-01-01-0000", memos: [newest], now: NOW }),
		).toThrow("src/content/memos/2026-01-01-0000.md");
	});

	test("id を指定したときは、ほかのメモの書式の誤りで止めない", () => {
		const broken = memo("2026-11-01-1000", "文だけで見出しがない");
		const change = planAddNote({
			id: "2026-11-14-2100",
			memos: [broken, older],
			now: NOW,
		});

		expect(change.id).toBe("2026-11-14-2100");
	});

	test("メモが 1 つもなければエラー", () => {
		expect(() => planAddNote({ memos: [], now: NOW })).toThrow("メモがない");
	});

	test("いちばん新しいメモは、ファイル名ではなく先頭の見出しの日時で決める", () => {
		const change = planAddNote({
			memos: [
				memo("2026-11-15-1020", "## 2026-11-15 10:20", "", "a"),
				memo("2026-11-01-0900", "## 2026-11-15 12:00", "", "b"),
			],
			now: NOW,
		});

		expect(change.id).toBe("2026-11-01-0900");
	});

	test("先頭の日時が同じなら、id の大きいほうに足す", () => {
		const change = planAddNote({
			memos: [
				memo(`${NOW_ID}-2`, NOW_HEADING, "", "後"),
				memo(NOW_ID, NOW_HEADING, "", "先"),
			],
			now: NOW,
		});

		expect(change.id).toBe(`${NOW_ID}-2`);
	});
});
