import * as v from "valibot";
import { describe, expect, test } from "vitest";
import { formatIsoDate } from "./date.ts";
import {
	comparePosts,
	getExcerpt,
	getToc,
	PostFrontmatterSchema,
	parsePostSlug,
	readPublishedAtSource,
} from "./post.ts";

describe("PostFrontmatterSchema", () => {
	const parse = (data: Record<string, unknown>) =>
		v.safeParse(PostFrontmatterSchema, {
			publishedAt: "2026-11-15",
			title: "10番ピンが残る理由",
			...data,
		});

	test("必須の項目だけで通る", () => {
		expect(parse({}).success).toBe(true);
	});

	test("title がない・空だと落ちる", () => {
		expect(parse({ title: undefined }).success).toBe(false);
		expect(parse({ title: "" }).success).toBe(false);
	});

	test("description は省けるが、空は落ちる", () => {
		expect(parse({ description: "手首の返りを見比べた。" }).success).toBe(true);
		expect(parse({ description: "" }).success).toBe(false);
	});

	test("thumbnail は media: で始まる文字列だけ通り、論理パスにする", () => {
		const result = parse({ thumbnail: "media:2026/ten-pin/lane.jpg" });
		expect(result.success && result.output.thumbnail).toBe(
			"2026/ten-pin/lane.jpg",
		);
		expect(parse({ thumbnail: "/images/lane.jpg" }).success).toBe(false);
	});

	test("知らない項目は、項目の名前を出して落ちる", () => {
		const result = parse({ descripton: "綴りの誤り" });

		expect(result.success).toBe(false);
		if (result.success) return;
		expect(v.summarize(result.issues)).toContain("descripton");
		expect(parse({ draft: true }).success).toBe(false);
	});

	test("日付を、日本時間でも同じ日付として扱う", () => {
		const result = parse({ publishedAt: "2026-01-01" });

		expect(result.success).toBe(true);
		if (!result.success) return;
		expect(formatIsoDate({ date: result.output.publishedAt })).toBe(
			"2026-01-01",
		);
	});

	test("時刻つきは落ちる", () => {
		expect(parse({ publishedAt: "2026-11-15T10:00:00" }).success).toBe(false);
		expect(parse({ publishedAt: "2026-11-15T00:00:00Z" }).success).toBe(false);
	});

	test("存在しない日付は落ちる", () => {
		expect(parse({ publishedAt: "2026-02-30" }).success).toBe(false);
		expect(parse({ publishedAt: "2026-13-01" }).success).toBe(false);
	});

	test("YAML が変換した Date は受けない（書かれた文字列で検査するため）", () => {
		expect(
			parse({ publishedAt: new Date("2026-11-15T00:00:00Z") }).success,
		).toBe(false);
	});

	test("publishedAt がないと落ちる", () => {
		expect(parse({ publishedAt: undefined }).success).toBe(false);
	});
});

describe("readPublishedAtSource", () => {
	const source = (line: string) =>
		`---\ntitle: 題\n${line}\n---\n\npublishedAt: 本文の行\n`;

	test("引用符なし・引用符つきの日付を、書かれたまま返す", () => {
		expect(
			readPublishedAtSource({ source: source("publishedAt: 2026-02-30") }),
		).toBe("2026-02-30");
		expect(
			readPublishedAtSource({ source: source('publishedAt: "2026-11-15"') }),
		).toBe("2026-11-15");
		expect(
			readPublishedAtSource({ source: source("publishedAt: '2026-11-15'") }),
		).toBe("2026-11-15");
	});

	test("行末のコメントは含めない", () => {
		expect(
			readPublishedAtSource({
				source: source("publishedAt: 2026-11-15 # 大会の日"),
			}),
		).toBe("2026-11-15");
	});

	test("時刻つきは時刻ごと返し、検査で落とせるようにする", () => {
		expect(
			readPublishedAtSource({
				source: source("publishedAt: 2026-11-15T00:00:00Z"),
			}),
		).toBe("2026-11-15T00:00:00Z");
	});

	test("フロントマターになければ、本文の行は読まない", () => {
		expect(readPublishedAtSource({ source: source("") })).toBeUndefined();
		expect(
			readPublishedAtSource({ source: "publishedAt: 2026-11-15\n" }),
		).toBeUndefined();
	});
});

describe("parsePostSlug", () => {
	test("ファイル名（拡張子なし）がスラッグになる", () => {
		expect(
			parsePostSlug({ filePath: "src/content/posts/ten-pin-2026.md" }),
		).toEqual({ isDraft: false, slug: "ten-pin-2026" });
	});

	test("_ で始まるファイルは下書きで、スラッグは _ を残す", () => {
		expect(parsePostSlug({ filePath: "src/content/posts/_k3f9.md" })).toEqual({
			isDraft: true,
			slug: "_k3f9",
		});
	});

	test.each([
		["大文字", "Ten-Pin.md"],
		["途中のアンダースコア", "ten_pin.md"],
		["二重の _", "__k3f9.md"],
		["連続したハイフン", "ten--pin.md"],
		["先頭のハイフン", "-ten.md"],
		["page", "page.md"],
		["_page（公開すると page になる）", "_page.md"],
		["空", ".md"],
		["_ だけ", "_.md"],
	])("%s は、ファイル名を含むエラーで落ちる", (_, fileName) => {
		const filePath = `src/content/posts/${fileName}`;
		expect(() => parsePostSlug({ filePath })).toThrow(filePath);
	});

	test("page を含むだけの名前は通る", () => {
		expect(parsePostSlug({ filePath: "pages.md" }).slug).toBe("pages");
		expect(parsePostSlug({ filePath: "page-2.md" }).slug).toBe("page-2");
	});
});

describe("comparePosts", () => {
	test("日付の新しい順、同じ日付はファイル名の昇順", () => {
		const posts = [
			{ publishedAt: new Date("2026-11-01T00:00:00Z"), slug: "b" },
			{ publishedAt: new Date("2026-11-15T00:00:00Z"), slug: "z" },
			{ publishedAt: new Date("2026-11-01T00:00:00Z"), slug: "a" },
			{ publishedAt: new Date("2026-11-15T00:00:00Z"), slug: "m" },
			{ publishedAt: new Date("2025-12-31T00:00:00Z"), slug: "a" },
		];

		expect(
			posts
				.toSorted(comparePosts)
				.map(
					({ publishedAt, slug }) =>
						`${publishedAt.toISOString().slice(0, 10)} ${slug}`,
				),
		).toEqual([
			"2026-11-15 m",
			"2026-11-15 z",
			"2026-11-01 a",
			"2026-11-01 b",
			"2025-12-31 a",
		]);
	});
});

describe("getExcerpt", () => {
	test("本文の文を、タグを外し空白を詰めて返す", () => {
		expect(
			getExcerpt({
				html: "<p>3 ゲーム投げた。\n<strong>10番ピン</strong>が残る。</p>\n<ul>\n<li>親指</li>\n</ul>",
			}),
		).toBe("3 ゲーム投げた。 10番ピンが残る。 親指");
	});

	test("見出し、コードブロック、表を含まない", () => {
		const excerpt = getExcerpt({
			html: [
				'<h2 id="a">見出しの文</h2>',
				"<p>前の段落。</p>",
				'<pre class="astro-code"><code><span>const score = 300;</span></code></pre>',
				"<table><thead><tr><th>ゲーム</th></tr></thead><tbody><tr><td>182</td></tr></tbody></table>",
				"<h3>小見出し</h3>",
				"<p>後の段落。</p>",
			].join("\n"),
		});

		expect(excerpt).toBe("前の段落。 後の段落。");
	});

	test("文字参照を戻す", () => {
		expect(
			getExcerpt({
				html: "<p>&lt;b&gt; &amp; &quot;q&quot; &#39;s&#39; &#x3C;x&#x3E; &#12354;</p>",
			}),
		).toBe(`<b> & "q" 's' <x> あ`);
	});

	test("120 字を超えると 120 字で切って … を付ける", () => {
		const text = "あ".repeat(130);

		expect(getExcerpt({ html: `<p>${text}</p>` })).toBe(`${"あ".repeat(120)}…`);
	});

	test("120 字ちょうどなら切らない", () => {
		const text = "あ".repeat(120);

		expect(getExcerpt({ html: `<p>${text}</p>` })).toBe(text);
	});

	test("切った末尾の空白は残さない", () => {
		const text = `${"あ".repeat(119)} いいい${"う".repeat(20)}`;

		expect(getExcerpt({ html: `<p>${text}</p>` })).toBe(`${"あ".repeat(119)}…`);
	});

	test("結合した絵文字の途中で切らない", () => {
		const family = "👨‍👩‍👧";
		const text = `${"あ".repeat(119)}${family}${"う".repeat(5)}`;

		expect(getExcerpt({ html: `<p>${text}</p>` })).toBe(
			`${"あ".repeat(119)}${family}…`,
		);
	});

	test("範囲外の数値参照でも落ちず、ブラウザと同じく置換文字にする", () => {
		expect(getExcerpt({ html: "<p>&#x110000;</p>" })).toBe("\uFFFD");
	});

	test("属性値の中の > で文が切れない", () => {
		expect(
			getExcerpt({
				html: '<p>図 <img src="a.jpg" alt="手首 > 親指"> と <a href="/" title="a > b">リンク</a> の文。</p>',
			}),
		).toBe("図 と リンク の文。");
	});

	test("コメント、script、style の中身を含まない", () => {
		expect(
			getExcerpt({
				html: "<!-- a > b のときは消す --><style>p { color: red; }</style><script>alert(1)</script><p>本文。</p>",
			}),
		).toBe("本文。");
	});

	test("名前つきの文字参照を戻す", () => {
		expect(getExcerpt({ html: "<p>&copy; &hellip;</p>" })).toBe("© …");
	});

	test("ブロックの境目に空白を入れ、文の途中のタグでは入れない", () => {
		expect(
			getExcerpt({
				html: "<p>前の<strong>段落</strong>。</p><p>後の段落。</p>",
			}),
		).toBe("前の段落。 後の段落。");
	});

	test("脚注の参照番号と脚注の文を含まない", () => {
		expect(
			getExcerpt({
				html: [
					'<p>本文<sup><a href="#user-content-fn-1" id="user-content-fnref-1" data-footnote-ref aria-describedby="footnote-label">1</a></sup>と続き。</p>',
					'<section data-footnotes class="footnotes"><h2 class="sr-only" id="footnote-label">Footnotes</h2>',
					'<ol><li id="user-content-fn-1"><p>脚注の文。 <a href="#user-content-fnref-1" data-footnote-backref="" class="data-footnote-backref">↩</a></p></li></ol></section>',
				].join("\n"),
			}),
		).toBe("本文と続き。");
	});

	test("文がない本文では空文字", () => {
		expect(
			getExcerpt({ html: "<h2>見出し</h2><pre><code>x</code></pre>" }),
		).toBe("");
	});
});

describe("getToc", () => {
	const heading = (depth: number, text: string) => ({
		depth,
		slug: `id-${text}`,
		text,
	});

	test("h2 と h3 だけを順に並べる", () => {
		expect(
			getToc({
				headings: [
					heading(1, "題"),
					heading(2, "A"),
					heading(3, "B"),
					heading(4, "C"),
					heading(2, "D"),
				],
			}),
		).toEqual([
			{ depth: 2, id: "id-A", text: "A" },
			{ depth: 3, id: "id-B", text: "B" },
			{ depth: 2, id: "id-D", text: "D" },
		]);
	});

	test("h2 と h3 が 3 件未満なら目次を出さない", () => {
		expect(
			getToc({
				headings: [heading(2, "A"), heading(3, "B"), heading(4, "C")],
			}),
		).toEqual([]);
		expect(getToc({ headings: [] })).toEqual([]);
	});

	test("脚注の区画の見出しは載せず、数にも入れない", () => {
		expect(
			getToc({
				headings: [
					heading(2, "A"),
					heading(2, "B"),
					{ depth: 2, slug: "footnote-label", text: "Footnotes" },
				],
			}),
		).toEqual([]);
	});
});
