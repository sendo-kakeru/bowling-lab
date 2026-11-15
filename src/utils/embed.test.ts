import { markdownToHtml } from "satteri";
import { describe, expect, test } from "vitest";
import { embedPlugin, parseEmbed } from "./embed.ts";

describe("parseEmbed", () => {
	test.each([
		["https://www.youtube.com/watch?v=dQw4w9WgXcQ", "video"],
		["https://youtube.com/watch?v=dQw4w9WgXcQ&feature=share", "video"],
		["https://m.youtube.com/watch?v=dQw4w9WgXcQ", "video"],
		["https://youtu.be/dQw4w9WgXcQ", "video"],
		["https://youtu.be/dQw4w9WgXcQ?si=abc", "video"],
		["https://www.youtube.com/shorts/dQw4w9WgXcQ", "shorts"],
	])("YouTube の %s から id を取り出す", (href, format) => {
		expect(parseEmbed({ href })).toEqual({
			format,
			id: "dQw4w9WgXcQ",
			provider: "youtube",
		});
	});

	test.each([
		["https://youtu.be/dQw4w9WgXcQ?t=90", 90],
		["https://youtu.be/dQw4w9WgXcQ?t=90s", 90],
		["https://www.youtube.com/watch?v=dQw4w9WgXcQ&t=1m30s", 90],
		["https://www.youtube.com/watch?v=dQw4w9WgXcQ&t=1h2m3s", 3723],
	])("YouTube の開始位置 %s を秒にする", (href, start) => {
		expect(parseEmbed({ href })).toMatchObject({ start });
	});

	test("読めない開始位置は捨てる", () => {
		expect(
			parseEmbed({ href: "https://youtu.be/dQw4w9WgXcQ?t=abc" }),
		).not.toHaveProperty("start");
		expect(
			parseEmbed({ href: "https://youtu.be/dQw4w9WgXcQ?t=0" }),
		).not.toHaveProperty("start");
	});

	test.each([
		["https://www.instagram.com/p/C1a2B3c4D5e/", "p"],
		["https://instagram.com/p/C1a2B3c4D5e", "p"],
		["https://www.instagram.com/reel/C1a2B3c4D5e/?igsh=xyz", "reel"],
		["https://www.instagram.com/someone/reel/C1a2B3c4D5e/", "reel"],
		["https://www.instagram.com/someone/p/C1a2B3c4D5e/", "p"],
	])("Instagram の %s から id を取り出す", (href, format) => {
		expect(parseEmbed({ href })).toEqual({
			format,
			id: "C1a2B3c4D5e",
			provider: "instagram",
		});
	});

	test.each([
		"https://www.youtube.com/",
		"https://www.youtube.com/watch",
		"https://www.youtube.com/watch?v=short",
		"https://www.youtube.com/@channel",
		"https://youtu.be/",
		"https://www.instagram.com/someone/",
		"https://www.instagram.com/stories/someone/123/",
		"https://www.instagram.com/someone/tagged/",
		"https://example.com/watch?v=dQw4w9WgXcQ",
		"https://x.com/someone/status/1",
		"https://constructor/",
		"https://__proto__/x",
		"ftp://youtu.be/dQw4w9WgXcQ",
		"not a url",
	])("対象外の %s は undefined", (href) => {
		expect(parseEmbed({ href })).toBeUndefined();
	});
});

describe("embedPlugin", () => {
	const render = (markdown: string) =>
		markdownToHtml(markdown, { hastPlugins: [embedPlugin] }).html;

	test("URL だけの段落を YouTube の埋め込みにする", () => {
		const html = render("https://www.youtube.com/watch?v=dQw4w9WgXcQ&t=30");
		expect(html).toContain('<div class="embed embed-landscape"><iframe');
		expect(html).toContain(
			'src="https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ?start=30"',
		);
		expect(html).toContain('title="YouTube の動画"');
		expect(html).toContain('loading="lazy"');
		expect(html).not.toContain("<p>");
	});

	test("日本語を含む URL も置き換える", () => {
		expect(
			render(
				"https://www.youtube.com/watch?v=dQw4w9WgXcQ&ab_channel=ボウリング",
			),
		).toContain('class="embed embed-landscape"');
	});

	test("ショートは縦長の枠にする", () => {
		expect(render("https://www.youtube.com/shorts/dQw4w9WgXcQ")).toContain(
			'class="embed embed-portrait"',
		);
	});

	test("Instagram は投稿 URL に /embed を付ける", () => {
		const html = render("https://www.instagram.com/reel/C1a2B3c4D5e/");
		expect(html).toContain('class="embed embed-instagram"');
		expect(html).toContain(
			'src="https://www.instagram.com/reel/C1a2B3c4D5e/embed/"',
		);
		expect(html).not.toContain("<script");
	});

	test("前後の段落はそのまま残す", () => {
		const html = render("前\n\nhttps://youtu.be/dQw4w9WgXcQ\n\n後");
		expect(html).toMatch(/<p>前<\/p>\s*<div class="embed/);
		expect(html).toMatch(/<\/div>\s*<p>後<\/p>/);
	});

	test.each([
		["文中の URL", "投球は https://youtu.be/dQw4w9WgXcQ を見て"],
		["リンク記法", "[投球の動画](https://youtu.be/dQw4w9WgXcQ)"],
		["インラインコード", "`https://youtu.be/dQw4w9WgXcQ`"],
		["コードブロック", "```\nhttps://youtu.be/dQw4w9WgXcQ\n```"],
		["引用の中", "> https://youtu.be/dQw4w9WgXcQ"],
		["リストの中", "- https://youtu.be/dQw4w9WgXcQ"],
		["対象外のサービス", "https://x.com/someone/status/1"],
		["スキームなしの URL", "www.youtube.com/watch?v=dQw4w9WgXcQ"],
	])("%s は置き換えない", (_, markdown) => {
		expect(render(markdown)).not.toContain("<iframe");
	});
});
