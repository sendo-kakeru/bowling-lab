import { getCollection } from "astro:content";
import * as v from "valibot";
import { type Memo, MemoSchema } from "./memo-schema.ts";

/**
 * メモを先頭の書き込みの日時の新しい順で返す。続きを足しても順番は変わらない。
 * 同じ日時なら id の降順（同じ分に作った `-2` つきのファイルを後の作成として前に出す）
 */
export async function getMemos(): Promise<Memo[]> {
	const entries = await getCollection("memos");
	const memos = entries.map(({ data, id }) =>
		v.parse(MemoSchema, { id, notes: data.notes }),
	);
	return memos.sort(
		(a, b) =>
			b.notes[0].postedAt.getTime() - a.notes[0].postedAt.getTime() ||
			b.id.localeCompare(a.id),
	);
}
