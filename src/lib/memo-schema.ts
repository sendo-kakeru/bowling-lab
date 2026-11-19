import * as v from "valibot";
import { formatMemoHeading } from "./memo-heading.ts";
import { MemoParseError, type ParsedMemoNote } from "./parse-memo.ts";

/** `2026-11-06 21:14` を日本時間として読む。存在しない日付は Date が繰り上げるので、ここでは検査しない */
function toJstDate({ postedAt }: { postedAt: string }): Date {
	return new Date(`${postedAt.replace(" ", "T")}:00+09:00`);
}

/**
 * 見出しの日時（`2026-11-06 21:14`）を日本時間の Date にする。
 * `2026-02-30` は Date が 3 月 2 日に繰り上げるので、書き戻して同じ文字列になるかで落とす
 */
const PostedAtSchema = v.pipe(
	v.string(),
	v.check((postedAt) => {
		const date = toJstDate({ postedAt });
		return (
			!Number.isNaN(date.getTime()) &&
			formatMemoHeading({ date }) === `## ${postedAt}`
		);
	}, "存在しない日時"),
	v.transform((postedAt) => toJstDate({ postedAt })),
);

/** 日時を Date にした書き込み */
interface DatedMemoNote extends Omit<ParsedMemoNote, "postedAt"> {
	postedAt: Date;
}

/**
 * 書き込みの日時を Date にする。存在しない日時と、前の書き込みより古い日時は、
 * その見出しの行番号つきで投げる（同じ分は許す）
 */
export function resolvePostedAt({
	notes,
}: {
	notes: readonly ParsedMemoNote[];
}): DatedMemoNote[] {
	const resolved: DatedMemoNote[] = [];
	for (const note of notes) {
		const result = v.safeParse(PostedAtSchema, note.postedAt);
		if (!result.success) {
			throw new MemoParseError({
				line: note.line,
				message: `${result.issues[0].message}: ${note.postedAt}`,
			});
		}
		const previous = resolved.at(-1);
		if (previous && result.output < previous.postedAt) {
			throw new MemoParseError({
				line: note.line,
				message: `日時が前の書き込み（${previous.line} 行目）より古い: ${note.postedAt}`,
			});
		}
		resolved.push({ ...note, postedAt: result.output });
	}
	return resolved;
}

const MemoNoteSchema = v.object({
	html: v.string(),
	postedAt: v.date(),
});

/** ローダーが store に入れたメモ。取得関数で検証して型を付ける */
export const MemoSchema = v.object({
	id: v.string(),
	notes: v.tupleWithRest([MemoNoteSchema], MemoNoteSchema),
});

export type Memo = v.InferOutput<typeof MemoSchema>;

/**
 * 先頭の書き込みの日時の新しい順。続きを足しても順番は変わらない。
 * 同じ日時なら id の降順（同じ分に作った `-2` つきのファイルを、後の作成として前に出す）
 */
export function compareMemos(
	a: Pick<Memo, "id" | "notes">,
	b: Pick<Memo, "id" | "notes">,
): number {
	const byDate = b.notes[0].postedAt.getTime() - a.notes[0].postedAt.getTime();
	if (byDate !== 0) return byDate;
	if (a.id === b.id) return 0;
	return a.id < b.id ? 1 : -1;
}
