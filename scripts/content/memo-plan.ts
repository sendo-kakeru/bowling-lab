import { MEMO_DIR } from "../../src/consts.ts";
import { formatMemoHeading } from "../../src/lib/content/memo-heading.ts";
import {
	type ParsedMemoNote,
	parseMemoSections,
	withMemoFilePath,
} from "../../src/lib/content/parse-memo.ts";
import { formatIsoDate, formatTime } from "../../src/lib/date.ts";

/*
  メモを作るコマンドの判断の部分。どのファイルに何を書くかを決めるだけで、読み書きはしない
*/

/** メモのファイル 1 つ。id はファイル名（拡張子なし） */
export interface MemoFile {
	id: string;
	source: string;
}

/** ファイルへの書き込み 1 件。rename は fromId を消して id に書く */
export type MemoChange =
	| { kind: "create"; id: string; source: string }
	| { kind: "update"; id: string; source: string }
	| { kind: "rename"; fromId: string; id: string; source: string };

interface SectionedMemo extends MemoFile {
	sections: ParsedMemoNote[];
}

/** 日本時間の日時からメモの id を作る。例: `2026-11-15-2114` */
export function formatMemoId({ date }: { date: Date }): string {
	return `${formatIsoDate({ date })}-${formatTime({ date }).replace(":", "")}`;
}

/** 書式の誤りは、ファイルのパスと行番号つきで投げる */
function sectionMemo({ memo }: { memo: MemoFile }): SectionedMemo {
	const sections = withMemoFilePath({
		filePath: `${MEMO_DIR}/${memo.id}.md`,
		parse: () => parseMemoSections({ source: memo.source }).sections,
	});
	return { ...memo, sections };
}

/**
 * 先頭の見出しの日時がいちばん新しいメモ。同じ日時なら id の大きいほう（compareMemos からピン留めを除いた順）。
 * 見出しのないファイルは数えない
 */
function findNewest({
	memos,
}: {
	memos: readonly SectionedMemo[];
}): SectionedMemo | undefined {
	let newest: { memo: SectionedMemo; postedAt: string } | undefined;
	for (const memo of memos) {
		const postedAt = memo.sections[0]?.postedAt;
		if (postedAt === undefined) continue;
		if (
			newest === undefined ||
			postedAt > newest.postedAt ||
			(postedAt === newest.postedAt && memo.id > newest.memo.id)
		) {
			newest = { memo, postedAt };
		}
	}
	return newest?.memo;
}

// 新しいメモの meta エリアに、書ける項目をコメントで添える
const OPTIONAL_FIELD_HINTS = ["# pinned: true"];

/**
 * line 行目の空の見出しを heading に書き換える。
 * 見出しより後ろは空行だけなので、見出しの行の手前（meta エリアと前の書き込み）を残して書き直す
 */
function replaceBlankHeading({
	heading,
	line,
	source,
}: {
	heading: string;
	line: number;
	source: string;
}): string {
	const before = source
		.split(/\r\n|\r|\n/)
		.slice(0, line - 1)
		.map((line) => `${line}\n`)
		.join("");
	return `${before}${heading}\n\n`;
}

/** 同じ分のファイルがあれば `-2`、`-3` と番号を付ける */
function uniqueMemoId({
	date,
	taken,
}: {
	date: Date;
	taken: ReadonlySet<string>;
}): string {
	const base = formatMemoId({ date });
	if (!taken.has(base)) return base;
	for (let n = 2; ; n++) {
		const id = `${base}-${n}`;
		if (!taken.has(id)) return id;
	}
}

/**
 * `pnpm memo`。meta エリアと今の日時の見出しだけを書いたメモを作る。
 * いちばん新しいメモが見出し 1 つだけで文なしなら、作らずにその見出しとファイル名を今に直す（meta エリアは残す）
 */
export function planNewMemo({
	memos,
	now,
}: {
	memos: readonly MemoFile[];
	now: Date;
}): MemoChange {
	const sectioned = memos.map((memo) => sectionMemo({ memo }));
	const heading = formatMemoHeading({ date: now });
	const newest = findNewest({ memos: sectioned });
	const [only, ...rest] = newest?.sections ?? [];
	if (newest !== undefined && only?.markdown === "" && rest.length === 0) {
		const taken = new Set(
			memos.map(({ id }) => id).filter((id) => id !== newest.id),
		);
		const id = uniqueMemoId({ date: now, taken });
		const source = replaceBlankHeading({
			heading,
			line: only.line,
			source: newest.source,
		});
		return id === newest.id
			? { id, kind: "update", source }
			: { fromId: newest.id, id, kind: "rename", source };
	}
	const taken = new Set(memos.map(({ id }) => id));
	const source = [
		"---",
		...OPTIONAL_FIELD_HINTS,
		"---",
		"",
		heading,
		"",
		"",
	].join("\n");
	return { id: uniqueMemoId({ date: now, taken }), kind: "create", source };
}

/** `2026-11-15-1020`、`2026-11-15-1020.md`、`src/content/memos/2026-11-15-1020.md` のどれでも id にする */
function normalizeMemoId({ id }: { id: string }): string {
	return id.replace(/^.*[\\/]/, "").replace(/\.md$/, "");
}

/**
 * `pnpm memo:add [id]`。指定したメモ（省けばいちばん新しいメモ）の末尾に今の日時の見出しを足す。
 * 末尾の見出しの下が空なら、足さずにその見出しの日時を今に書き換える
 */
export function planAddNote({
	id,
	memos,
	now,
}: {
	id?: string;
	memos: readonly MemoFile[];
	now: Date;
}): MemoChange {
	let target: SectionedMemo | undefined;
	if (id === undefined) {
		target = findNewest({ memos: memos.map((memo) => sectionMemo({ memo })) });
		if (target === undefined) {
			throw new Error(`${MEMO_DIR} にメモがない。先に pnpm memo で作る`);
		}
	} else {
		const targetId = normalizeMemoId({ id });
		// 指定したメモだけを読む。ほかのメモの書式の誤りで止めないため
		const memo = memos.find((memo) => memo.id === targetId);
		if (memo === undefined) {
			throw new Error(`メモがない: ${MEMO_DIR}/${targetId}.md`);
		}
		target = sectionMemo({ memo });
	}

	const heading = formatMemoHeading({ date: now });
	const last = target.sections.at(-1);
	const source =
		last?.markdown === ""
			? replaceBlankHeading({ heading, line: last.line, source: target.source })
			: `${target.source.trimEnd()}\n\n${heading}\n\n`;
	return { id: target.id, kind: "update", source };
}
