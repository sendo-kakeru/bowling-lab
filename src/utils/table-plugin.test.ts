import { markdownToHtml } from "satteri";
import { describe, expect, test } from "vitest";
import { tablePlugin } from "./table-plugin.ts";

const toHtml = (markdown: string): string =>
	markdownToHtml(markdown, { hastPlugins: [tablePlugin] }).html;

describe("tablePlugin", () => {
	test("表を横スクロールの枠で 1 度だけ囲む", () => {
		const html = toHtml("| a | b |\n| - | - |\n| 1 | 2 |\n");
		expect(html).toMatch(/^<div class="table-scroll"><table>/);
		expect(html.match(/table-scroll/g)).toHaveLength(1);
	});

	test("表のない本文は変えない", () => {
		expect(toHtml("本文").trim()).toBe("<p>本文</p>");
	});
});
