import type { Memo } from "../../src/lib/content/memo-schema";

/* ストーリーで使うメモの伝票。続きの件数（紙の重なり）を変えて並べる */

function at({ jst }: { jst: string }): Date {
	return new Date(`${jst}:00+09:00`);
}

/** 続きがない。紙を重ねず、開閉もない */
export const MEMO_NO_REPLY: Memo = {
	id: "2026-11-04-1111",
	notes: [
		{
			html: "<p>シューズを替えたら、スライドが思ったより伸びる。</p>",
			postedAt: at({ jst: "2026-11-04T11:11" }),
		},
	],
	pinned: false,
};

/** 続きが 1 件。後ろの紙は 1 枚 */
export const MEMO_ONE_REPLY: Memo = {
	id: "2026-11-05-1340",
	notes: [
		{
			html: "<p>スパットを見るか、ブレイクポイントを見るか。まだ決めきれていない。</p>",
			postedAt: at({ jst: "2026-11-05T13:40" }),
		},
		{
			html: "<p>しばらくはスパットにする。近い目印のほうが狙いがぶれにくいと、投げてみて分かった。</p>",
			postedAt: at({ jst: "2026-11-07T09:00" }),
		},
	],
	pinned: false,
};

/** 続きが 4 件。後ろの紙は上限の 3 枚で止まる */
export const MEMO_MANY_REPLIES: Memo = {
	id: "2026-11-06-2114",
	notes: [
		{
			html: "<p>今日の 3 ゲーム。<strong>182・167・201</strong>。3 ゲーム目でようやくラインが見えた。</p>",
			postedAt: at({ jst: "2026-11-06T21:14" }),
		},
		{
			html: "<p>立ち位置を左に 2 枚。</p>",
			postedAt: at({ jst: "2026-11-06T21:20" }),
		},
		{
			html: "<p>球速は変えていない。</p>",
			postedAt: at({ jst: "2026-11-06T21:31" }),
		},
		{
			html: "<ul><li>1 ゲーム目は 10 番ピンが 3 回</li><li>2 ゲーム目はスプリットが 2 回</li></ul>",
			postedAt: at({ jst: "2026-11-07T08:02" }),
		},
		{
			html: '<p>次は <a href="#">ボールの表面</a> を見直す。</p>',
			postedAt: at({ jst: "2026-11-08T19:45" }),
		},
	],
	pinned: false,
};

/** 長い本文。行の折り返しと伝票の高さを確かめる */
export const MEMO_LONG: Memo = {
	id: "2026-11-02-0830",
	notes: [
		{
			html: "<p>朝のレーンはオイルがまだ伸びていない。1 ゲーム目は手前で曲がりすぎて、ポケットの手前で止まる球が多かった。2 ゲーム目から 1 枚ずつ外に出して、3 枚目でやっと戻ってくるようになった。次からは最初から 2 枚外で始めてみる。</p><p>メモ: 練習ボールは表面を #2000 で整えてから使うこと。</p>",
			postedAt: at({ jst: "2026-11-02T08:30" }),
		},
	],
	pinned: false,
};

/** ピン留めしたメモ。上の縁の中央に画鋲を刺す */
export const MEMO_PINNED: Memo = {
	id: "2026-10-30-2000",
	notes: [
		{
			html: "<p>投げる前に確かめること。立ち位置、スパット、親指の抜け。</p>",
			postedAt: at({ jst: "2026-10-30T20:00" }),
		},
	],
	pinned: true,
};

/** ピン留めしたメモで、続きもある */
export const MEMO_PINNED_REPLY: Memo = {
	...MEMO_ONE_REPLY,
	id: "2026-11-05-1340-2",
	pinned: true,
};

/** 新しい順 */
export const MEMOS: Memo[] = [
	MEMO_MANY_REPLIES,
	MEMO_ONE_REPLY,
	MEMO_NO_REPLY,
	MEMO_LONG,
];

/** ピン留めが先、その中と残りは新しい順（compareMemos の順） */
export const MEMOS_WITH_PINNED: Memo[] = [
	MEMO_PINNED_REPLY,
	MEMO_PINNED,
	...MEMOS,
];
