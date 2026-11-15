import { fromMarkdown } from "mdast-util-from-markdown";
import { matchMemoHeading } from "./memo-heading.ts";

/** メモの 1 ファイルを区切った、書き込み 1 件ぶん。日時はまだ文字列のまま */
export interface ParsedMemoNote {
	/** 見出しの日時（`2026-11-06 21:14`） */
	postedAt: string;
	/** 見出しの下の本文。前後の空行は除く */
	markdown: string;
	/** 見出しの行番号（1 始まり） */
	line: number;
}

/** メモの書式の誤り。ローダーがファイル名を足して出せるよう、行番号を持つ */
export class MemoParseError extends Error {
	/** 1 始まり */
	readonly line: number;

	constructor({ line, message }: { line: number; message: string }) {
		super(message);
		this.name = "MemoParseError";
		this.line = line;
	}
}

// 日付で始まる h2 は区切りの打ち間違いとみなす。黙って前の書き込みの本文に混ざるのを防ぐ
const MISTYPED_HEADING_PATTERN = /^## +\d{4}-/;

const isBlank = ({ line }: { line: string }): boolean => line.trim() === "";

/** 前後の空行を除いて行をつなぐ。1 行目の字下げは字下げのコードブロックなので残す */
function joinTrimmedLines({ lines }: { lines: readonly string[] }): string {
	const start = lines.findIndex((line) => !isBlank({ line }));
	if (start === -1) return "";
	const end = lines.findLastIndex((line) => !isBlank({ line }));
	return lines.slice(start, end + 1).join("\n");
}

/**
 * メモの本文を、`## YYYY-MM-DD HH:mm` の見出しで書き込みに分ける。
 * コードブロックや HTML コメントの中の見出しの形の行は区切りにしない。
 * 末尾の見出しの下が空なら読み飛ばす（コマンドが見出しだけを先に書くため）
 */
export function parseMemo({ source }: { source: string }): ParsedMemoNote[] {
	// BOM つきで保存されると、1 行目の見出しが見出しと判定されない
	const text = source.replace(/^\uFEFF/, "");
	// 単独の CR も行の区切りにする。構文木の行番号と数え方をそろえるため
	const lines = text.split(/\r\n|\r|\n/);
	// 区切りはトップレベルの見出しだけ。コードブロックや HTML コメントの中の行を除くため、行ではなく構文木で探す
	const headings: { postedAt: string; index: number }[] = [];
	for (const node of fromMarkdown(text).children) {
		if (node.type !== "heading" || node.position === undefined) continue;
		const index = node.position.start.line - 1;
		const line = lines[index] ?? "";
		const postedAt = matchMemoHeading({ line });
		if (postedAt !== undefined) {
			headings.push({ index, postedAt });
		} else if (MISTYPED_HEADING_PATTERN.test(line)) {
			throw new MemoParseError({
				line: index + 1,
				message: `見出しの書式が違う（## YYYY-MM-DD HH:mm）: ${line}`,
			});
		}
	}

	const firstHeadingIndex = headings[0]?.index ?? lines.length;
	const preambleIndex = lines
		.slice(0, firstHeadingIndex)
		.findIndex((line) => !isBlank({ line }));
	if (preambleIndex !== -1) {
		throw new MemoParseError({
			line: preambleIndex + 1,
			message: "最初の見出し（## YYYY-MM-DD HH:mm）より前に文がある",
		});
	}

	const notes: ParsedMemoNote[] = [];
	for (const [i, { index, postedAt }] of headings.entries()) {
		const nextIndex = headings[i + 1]?.index ?? lines.length;
		const markdown = joinTrimmedLines({
			lines: lines.slice(index + 1, nextIndex),
		});
		const line = index + 1;
		const isLast = i === headings.length - 1;
		if (markdown === "") {
			if (isLast) break;
			throw new MemoParseError({
				line,
				message: "見出しの下に文がない（空にしてよいのは末尾の見出しだけ）",
			});
		}
		notes.push({ line, markdown, postedAt });
	}
	return notes;
}
