import * as v from "valibot";
import { describe, expect, test } from "vitest";
import { formatIsoDate } from "./date.ts";
import {
	comparePosts,
	getExcerpt,
	getReadingMinutes,
	getToc,
	PostFrontmatterSchema,
	parsePostSlug,
} from "./post.ts";

describe("PostFrontmatterSchema", () => {
	const parse = (data: Record<string, unknown>) =>
		v.safeParse(PostFrontmatterSchema, {
			publishedAt: new Date("2026-11-15T00:00:00Z"),
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

	test("thumbnail は media: で始まる文字列だけ通る", () => {
		expect(parse({ thumbnail: "media:2026/ten-pin/lane.jpg" }).success).toBe(
			true,
		);
		expect(parse({ thumbnail: "/images/lane.jpg" }).success).toBe(false);
	});

	test("YAML の日付（UTC 0 時の Date）を、日本時間でも同じ日付として扱う", () => {
		const result = parse({ publishedAt: new Date("2026-11-15T00:00:00Z") });

		expect(result.success).toBe(true);
		if (!result.success) return;
		expect(formatIsoDate({ date: result.output.publishedAt })).toBe(
			"2026-11-15",
		);
	});

	test("引用符つきの日付の文字列も、日本時間で同じ日付になる", () => {
		const result = parse({ publishedAt: "2026-01-01" });

		expect(result.success).toBe(true);
		if (!result.success) return;
		expect(formatIsoDate({ date: result.output.publishedAt })).toBe(
			"2026-01-01",
		);
	});

	test("時刻つきは落ちる", () => {
		expect(
			parse({ publishedAt: new Date("2026-11-15T10:00:00Z") }).success,
		).toBe(false);
		expect(parse({ publishedAt: "2026-11-15T10:00:00" }).success).toBe(false);
	});

	test("存在しない日付は落ちる", () => {
		expect(parse({ publishedAt: "2026-02-30" }).success).toBe(false);
		expect(parse({ publishedAt: "2026-13-01" }).success).toBe(false);
		expect(parse({ publishedAt: new Date(Number.NaN) }).success).toBe(false);
	});

	test("publishedAt がないと落ちる", () => {
		expect(parse({ publishedAt: undefined }).success).toBe(false);
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
});

describe("getReadingMinutes", () => {
	test("日本語は 500 字で 1 分", () => {
		expect(getReadingMinutes({ html: `<p>${"あ".repeat(1000)}</p>` })).toBe(2);
		expect(getReadingMinutes({ html: `<p>${"あ".repeat(1001)}</p>` })).toBe(3);
	});

	test("英語は 200 語で 1 分", () => {
		expect(getReadingMinutes({ html: `<p>${"strike ".repeat(600)}</p>` })).toBe(
			3,
		);
	});

	test("日本語と英語が混ざると足し合わせる", () => {
		expect(
			getReadingMinutes({
				html: `<p>${"あ".repeat(500)}</p><p>${"spare ".repeat(200)}</p>`,
			}),
		).toBe(2);
	});

	test("タグは数えない", () => {
		expect(
			getReadingMinutes({
				html: `<p class="${"x ".repeat(500)}">短い</p>`,
			}),
		).toBe(1);
	});

	test("短くても最低 1 分", () => {
		expect(getReadingMinutes({ html: "" })).toBe(1);
		expect(getReadingMinutes({ html: "<p>ストライク</p>" })).toBe(1);
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
});
