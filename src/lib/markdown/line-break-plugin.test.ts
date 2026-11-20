import { markdownToHtml } from "satteri";
import { describe, expect, test } from "vitest";
import { lineBreakPlugin } from "./line-break-plugin.ts";

const toHtml = (markdown: string): string =>
	markdownToHtml(markdown, { mdastPlugins: [lineBreakPlugin] }).html.trim();

describe("lineBreakPlugin", () => {
	test("段落の中の改行を <br> にする", () => {
		expect(toHtml("1 行目\n2 行目\n3 行目")).toBe(
			"<p>1 行目<br>\n2 行目<br>\n3 行目</p>",
		);
	});

	test("強調をまたぐ改行も <br> にする", () => {
		expect(toHtml("**太字**\n続き")).toBe(
			"<p><strong>太字</strong><br>\n続き</p>",
		);
	});

	test("リストと引用の中の改行も <br> にする", () => {
		expect(toHtml("- 1 行目\n  2 行目")).toBe(
			"<ul>\n<li>1 行目<br>\n2 行目</li>\n</ul>",
		);
		expect(toHtml("> 1 行目\n> 2 行目")).toBe(
			"<blockquote>\n<p>1 行目<br>\n2 行目</p>\n</blockquote>",
		);
	});

	test("行末の空白 2 つの改行を二重にしない", () => {
		expect(toHtml("1 行目  \n2 行目")).toBe("<p>1 行目<br>\n2 行目</p>");
	});

	test("空行で分けた段落とコードブロックは変えない", () => {
		expect(toHtml("段落 1\n\n段落 2")).toBe("<p>段落 1</p>\n<p>段落 2</p>");
		expect(toHtml("```\na\nb\n```")).toBe("<pre><code>a\nb\n</code></pre>");
	});
});
