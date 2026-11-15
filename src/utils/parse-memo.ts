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

// CommonMark のフェンス。字下げは 3 文字まで（4 文字だと字下げのコードブロックになる）
const FENCE_OPEN_PATTERN = /^ {0,3}(`{3,}|~{3,})/;

interface Fence {
	char: string;
	length: number;
}

/** フェンスを開く行なら、その記号と長さを返す */
function openFence({ line }: { line: string }): Fence | undefined {
	const marker = FENCE_OPEN_PATTERN.exec(line)?.[1];
	if (marker === undefined) return undefined;
	const char = marker.charAt(0);
	// バッククォートのフェンスは、情報文字列にバッククォートを含められない
	if (
		char === "`" &&
		line.slice(line.indexOf(marker) + marker.length).includes("`")
	) {
		return undefined;
	}
	return { char, length: marker.length };
}

/** 開いたフェンスを閉じる行か。同じ記号で、開きと同じ長さ以上で、後ろは空白だけ */
function closesFence({ fence, line }: { fence: Fence; line: string }): boolean {
	const match = /^ {0,3}(`+|~+)[ \t]*$/.exec(line);
	const marker = match?.[1];
	return (
		marker !== undefined &&
		marker.charAt(0) === fence.char &&
		marker.length >= fence.length
	);
}

const isBlank = (line: string): boolean => line.trim() === "";

/** 前後の空行を除いて行をつなぐ。1 行目の字下げは字下げのコードブロックなので残す */
function joinTrimmedLines({ lines }: { lines: readonly string[] }): string {
	const start = lines.findIndex((line) => !isBlank(line));
	if (start === -1) return "";
	const end = lines.findLastIndex((line) => !isBlank(line));
	return lines.slice(start, end + 1).join("\n");
}

/**
 * メモの本文を、`## YYYY-MM-DD HH:mm` の見出しで書き込みに分ける。
 * コードブロックの中の見出しの形の行は区切りにしない。
 * 末尾の見出しの下が空なら読み飛ばす（コマンドが見出しだけを先に書くため）
 */
export function parseMemo({ source }: { source: string }): ParsedMemoNote[] {
	const lines = source.split(/\r?\n/);
	const headings: { postedAt: string; index: number }[] = [];

	let fence: Fence | undefined;
	for (const [index, line] of lines.entries()) {
		if (fence) {
			if (closesFence({ fence, line })) fence = undefined;
			continue;
		}
		const postedAt = matchMemoHeading({ line });
		if (postedAt !== undefined) {
			headings.push({ index, postedAt });
			continue;
		}
		fence = openFence({ line });
	}

	const firstHeadingIndex = headings[0]?.index ?? lines.length;
	const preambleIndex = lines
		.slice(0, firstHeadingIndex)
		.findIndex((line) => !isBlank(line));
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
