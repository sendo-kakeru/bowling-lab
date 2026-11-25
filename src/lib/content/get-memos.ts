import { getCollection } from "astro:content";
import * as v from "valibot";
import { compareMemos, type Memo, MemoSchema } from "./memo-schema.ts";

// 開発中、ローダーは書式の誤りをこの形で store に入れる
const MemoErrorSchema = v.object({ error: v.string() });

/** メモをピン留めが先、その中と残りは先頭の書き込みの日時の新しい順で返す。開発中に書式の誤ったメモがあれば投げる */
export async function getMemos(): Promise<Memo[]> {
	const entries = await getCollection("memos");
	const memos = entries.map(({ data, id }) => {
		const failed = v.safeParse(MemoErrorSchema, data);
		if (failed.success) throw new Error(failed.output.error);
		return v.parse(MemoSchema, { id, ...data });
	});
	return memos.toSorted(compareMemos);
}
