import type { Post } from "../../src/lib/get-posts";
import { parsePostSlug } from "../../src/lib/post";

/*
  ストーリーで使う記事。サムネイルは既定の画像にする
  （架空の記事なので、R2 にも media-manifest.json にも画像がないため）
*/

function post({
	slug,
	title,
	description,
	publishedAt,
}: {
	slug: string;
	title: string;
	description?: string;
	publishedAt: string;
}): Post {
	return {
		description,
		entry: { collection: "posts", data: {}, id: slug },
		isDraft: false,
		publishedAt: new Date(`${publishedAt}T00:00:00+09:00`),
		slug: parsePostSlug({ filePath: `src/content/posts/${slug}.md` }).slug,
		thumbnail: { source: "default" },
		title,
		toc: [],
	};
}

export const POSTS: Post[] = [
	post({
		description:
			"立ち位置だけを動かして、スパットとブレイクポイントの関係を確かめた記録。投げる強さとボールは変えていない。",
		publishedAt: "2026-11-06",
		slug: "breakpoint",
		title: "ブレイクポイントを2枚外に出すと、何が変わるか",
	}),
	post({
		description: "立ち位置、スパット、ブレイクポイントを 1 本の線で結ぶ。",
		publishedAt: "2026-10-28",
		slug: "stance-and-spat",
		title: "立ち位置とスパットの関係を図で整理する",
	}),
	post({
		publishedAt: "2026-10-15",
		slug: "oil-transition",
		title: "オイルの伸びを、投球ラインの変化で読む",
	}),
	post({
		description:
			"親指を先に抜くと回転が増える、と聞いて試した。結果は思ったより地味だったが、抜く速さのばらつきは減った。",
		publishedAt: "2026-09-30",
		slug: "thumb-release",
		title:
			"親指を抜くタイミングを 3 週間かけて変えてみた記録と、そのあいだに気づいたことのまとめ",
	}),
	post({
		description: "10 番ピンが残る投球を、立ち位置と球速から見直す。",
		publishedAt: "2026-09-12",
		slug: "ten-pin",
		title: "10 番ピンが残る理由",
	}),
];
