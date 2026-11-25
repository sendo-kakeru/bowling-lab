import { describe, expect, test } from "vitest";
import { catchMemoParseError } from "../test-helpers.ts";
import {
	MemoParseError,
	type ParsedMemoNote,
	parseMemo,
	parseMemoSections,
	withMemoFilePath,
} from "./parse-memo.ts";

/** 空の meta エリア（1、2 行目）のあとに行をつなぐ。見出しの行番号は 3 から数える */
function source(...lines: string[]): string {
	return ["---", "---", ...lines].join("\n");
}

function parseNotes({ source }: { source: string }): ParsedMemoNote[] {
	return parseMemo({ source }).notes;
}

/** parseMemo が投げた MemoParseError を取り出す */
function catchParseError({ source }: { source: string }): MemoParseError {
	return catchMemoParseError({ run: () => parseMemo({ source }) });
}

describe("parseMemo", () => {
	test("見出しごとに書き込みへ分け、日時と本文と見出しの行番号を返す", () => {
		const notes = parseNotes({
			source: source(
				"## 2026-11-06 21:14",
				"",
				"10番ピンだけ残る。",
				"",
				"## 2026-11-06 21:38",
				"",
				"親指の抜けが遅れていた。",
				"",
				"- 1 つ目",
				"- 2 つ目",
				"",
			),
		});

		expect(notes).toEqual([
			{ line: 3, markdown: "10番ピンだけ残る。", postedAt: "2026-11-06 21:14" },
			{
				line: 7,
				markdown: "親指の抜けが遅れていた。\n\n- 1 つ目\n- 2 つ目",
				postedAt: "2026-11-06 21:38",
			},
		]);
	});

	test("改行が CRLF でも分けられる", () => {
		const notes = parseNotes({
			source: "---\r\n---\r\n## 2026-11-06 21:14\r\n\r\n本文\r\n",
		});

		expect(notes).toEqual([
			{ line: 3, markdown: "本文", postedAt: "2026-11-06 21:14" },
		]);
	});

	test("先頭の BOM は無視する", () => {
		const notes = parseNotes({
			source: "\uFEFF---\n---\n## 2026-11-06 21:14\n本文",
		});

		expect(notes.map(({ line }) => line)).toEqual([3]);
	});

	test("単独の CR も行の区切りとして数える", () => {
		const notes = parseNotes({
			source: source(
				"## 2026-11-06 21:14",
				"本文\rもう1行",
				"## 2026-11-06 21:38",
				"続き",
			),
		});

		expect(notes.map(({ line }) => line)).toEqual([3, 6]);
	});

	test("見出しより前の空行は許す", () => {
		const notes = parseNotes({
			source: source("", "  ", "## 2026-11-06 21:14", "本文"),
		});

		expect(notes.map(({ line }) => line)).toEqual([5]);
	});

	test("本文の見出しの形でない ## は区切りにしない", () => {
		const notes = parseNotes({
			source: source("## 2026-11-06 21:14", "本文", "## 練習の記録", "続き"),
		});

		expect(notes).toHaveLength(1);
		expect(notes[0]?.markdown).toBe("本文\n## 練習の記録\n続き");
	});

	describe("コードブロックの中", () => {
		test.each([
			["```", "```"],
			["~~~", "~~~"],
			["```md", "```"],
			["````", "````"],
		])("%s で囲んだ見出しの形の行は区切りにしない", (open, close) => {
			const notes = parseNotes({
				source: source(
					"## 2026-11-06 21:14",
					open,
					"## 2026-11-07 10:00",
					close,
					"## 2026-11-06 21:38",
					"続き",
				),
			});

			expect(notes.map(({ postedAt }) => postedAt)).toEqual([
				"2026-11-06 21:14",
				"2026-11-06 21:38",
			]);
			expect(notes[0]?.markdown).toBe(
				[open, "## 2026-11-07 10:00", close].join("\n"),
			);
		});

		test("開きより短いフェンスや、違う記号では閉じない", () => {
			const notes = parseNotes({
				source: source(
					"## 2026-11-06 21:14",
					"````",
					"```",
					"~~~~",
					"## 2026-11-07 10:00",
					"````",
					"## 2026-11-06 21:38",
					"続き",
				),
			});

			expect(notes.map(({ line }) => line)).toEqual([3, 9]);
		});

		test("リストの中のコードブロックは、字下げした閉じまで続く", () => {
			const notes = parseNotes({
				source: source(
					"## 2026-11-06 21:14",
					"- 手順",
					"- ```js",
					"  ## 2026-11-07 10:00",
					"  ```",
					"",
					"## 2026-11-06 21:38",
					"続き",
				),
			});

			expect(notes.map(({ line }) => line)).toEqual([3, 9]);
		});

		test("閉じていないフェンスは末尾まで続く", () => {
			const notes = parseNotes({
				source: source(
					"## 2026-11-06 21:14",
					"```",
					"## 2026-11-07 10:00",
					"本文",
				),
			});

			expect(notes).toHaveLength(1);
		});
	});

	test("HTML コメントの中の見出しの形の行は区切りにしない", () => {
		const notes = parseNotes({
			source: source(
				"## 2026-11-06 21:14",
				"本文",
				"<!--",
				"## 2026-11-06 21:38",
				"隠したい",
				"-->",
			),
		});

		expect(notes).toHaveLength(1);
	});

	describe("書式の誤り", () => {
		test("最初の見出しより前に文があると、その行番号でエラー", () => {
			const error = catchParseError({
				source: source("", "前置き", "## 2026-11-06 21:14", "本文"),
			});

			expect(error.line).toBe(4);
			expect(error.message).toContain("最初の見出し");
		});

		test("見出しがなく文だけなら、最初の文の行でエラー", () => {
			const error = catchParseError({ source: source("本文だけ") });

			expect(error.line).toBe(3);
		});

		test("日付で始まるのに書式の違う見出しは、その行番号でエラー", () => {
			const error = catchParseError({
				source: source(
					"## 2026-11-06 21:14",
					"本文",
					"## 2026-11-7 10:00",
					"続き",
				),
			});

			expect(error.line).toBe(5);
			expect(error.message).toContain("見出しの書式が違う");
		});

		test("日付で始まらない ## はエラーにしない", () => {
			const notes = parseNotes({
				source: source("## 2026-11-06 21:14", "本文", "## 3 ゲーム目", "続き"),
			});

			expect(notes).toHaveLength(1);
		});

		test("途中の見出しの下が空だと、その見出しの行番号でエラー", () => {
			const error = catchParseError({
				source: source(
					"## 2026-11-06 21:14",
					"本文",
					"## 2026-11-06 21:20",
					"",
					"## 2026-11-06 21:38",
					"続き",
				),
			});

			expect(error.line).toBe(5);
			expect(error.message).toContain("見出しの下に文がない");
		});
	});

	describe("読み飛ばし", () => {
		test("末尾の見出しの下が空なら、その見出しは読み飛ばす", () => {
			const notes = parseNotes({
				source: source(
					"## 2026-11-06 21:14",
					"本文",
					"",
					"## 2026-11-06 21:38",
					"",
					"",
				),
			});

			expect(notes).toEqual([
				{ line: 3, markdown: "本文", postedAt: "2026-11-06 21:14" },
			]);
		});

		test("見出しだけのファイルは空の配列", () => {
			expect(parseNotes({ source: source("## 2026-11-06 21:14", "") })).toEqual(
				[],
			);
		});

		test("meta エリアだけのファイルは空の配列", () => {
			expect(parseNotes({ source: source("") })).toEqual([]);
		});
	});
});

describe("meta エリア", () => {
	test("項目をオブジェクトで返す。見出しの行番号はファイルの行のまま", () => {
		const memo = parseMemo({
			source: [
				"---",
				"pinned: true",
				"---",
				"",
				"## 2026-11-06 21:14",
				"本文",
			].join("\n"),
		});

		expect(memo).toEqual({
			frontmatter: { pinned: true },
			notes: [{ line: 5, markdown: "本文", postedAt: "2026-11-06 21:14" }],
		});
	});

	test("コメントだけなら、項目は空", () => {
		const { frontmatter } = parseMemo({
			source: [
				"---",
				"# pinned: true",
				"---",
				"## 2026-11-06 21:14",
				"本文",
			].join("\n"),
		});

		expect(frontmatter).toEqual({});
	});

	test.each([
		["空のファイル", ""],
		["見出しから始まる", "## 2026-11-06 21:14\n本文"],
		["区切り線が本文の途中にだけある", "## 2026-11-06 21:14\n---\n本文\n---\n"],
	])("ないと 1 行目でエラー: %s", (_, source) => {
		const error = catchParseError({ source });

		expect(error.line).toBe(1);
		expect(error.message).toContain("meta エリア");
	});

	test("YAML の誤りは、ファイルのパスと 1 行目つきで投げる", () => {
		expect(() =>
			withMemoFilePath({
				filePath: "src/content/memos/2026-11-06-2114.md",
				parse: () =>
					parseMemo({ source: source().replace("---", "---\npinned: [") }),
			}),
		).toThrow(
			/^src\/content\/memos\/2026-11-06-2114\.md:1 meta エリアの YAML が読めない/,
		);
	});
});

describe("parseMemoSections", () => {
	test("末尾の見出しの下が空なら、その区切りも本文を空にして返す", () => {
		const { sections } = parseMemoSections({
			source: source(
				"## 2026-11-06 21:14",
				"本文",
				"",
				"## 2026-11-06 21:38",
				"",
			),
		});

		expect(sections).toEqual([
			{ line: 3, markdown: "本文", postedAt: "2026-11-06 21:14" },
			{ line: 6, markdown: "", postedAt: "2026-11-06 21:38" },
		]);
	});

	test("見出しだけのファイルは、空の区切り 1 つ", () => {
		expect(
			parseMemoSections({ source: source("## 2026-11-06 21:14", "") }).sections,
		).toEqual([{ line: 3, markdown: "", postedAt: "2026-11-06 21:14" }]);
	});

	test("途中の見出しの下が空なら、parseMemo と同じくエラー", () => {
		expect(() =>
			parseMemoSections({
				source: source(
					"## 2026-11-06 21:14",
					"",
					"## 2026-11-06 21:38",
					"続き",
				),
			}),
		).toThrow(MemoParseError);
	});
});
