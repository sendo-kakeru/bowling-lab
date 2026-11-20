import type { TocItem } from "../../src/lib/content/post";

/* ストーリーで使う目次。h2 と h3 を混ぜる */

export const TOC_ITEMS: TocItem[] = [
	{ depth: 2, id: "why", text: "なぜ立ち位置を動かしたか" },
	{ depth: 2, id: "setup", text: "試した条件" },
	{ depth: 3, id: "ball", text: "ボールと表面" },
	{ depth: 3, id: "lane", text: "レーンのコンディション" },
	{
		depth: 2,
		id: "result",
		text: "結果：ブレイクポイントは 1 枚だけ外に動いた",
	},
	{ depth: 3, id: "spare", text: "スペアへの影響" },
	{ depth: 2, id: "next", text: "次に試すこと" },
];
