import { describe, expect, test } from "vitest";
import {
	getPageHref,
	getRestPageStaticPaths,
	paginate,
} from "./pagination.ts";

function range({ length }: { length: number }): number[] {
	return Array.from({ length }, (_, i) => i + 1);
}

describe("paginate", () => {
	test("件数がページあたりの件数より多いと、複数のページに分ける", () => {
		const pages = paginate({ items: range({ length: 45 }), perPage: 20 });

		expect(pages.map(({ page }) => page)).toEqual([1, 2, 3]);
		expect(pages.map(({ items }) => items.length)).toEqual([20, 20, 5]);
		expect(pages.map(({ pageCount }) => pageCount)).toEqual([3, 3, 3]);
	});

	test("順番を保つ", () => {
		const [first, second] = paginate({
			items: range({ length: 5 }),
			perPage: 2,
		});

		expect(first.items).toEqual([1, 2]);
		expect(second?.items).toEqual([3, 4]);
	});

	test("ちょうど割り切れるとき、空のページを作らない", () => {
		const pages = paginate({ items: range({ length: 40 }), perPage: 20 });

		expect(pages).toHaveLength(2);
	});

	test("0 件でも 1 ページ目は返す", () => {
		const pages = paginate({ items: [], perPage: 20 });

		expect(pages).toEqual([{ items: [], page: 1, pageCount: 1 }]);
	});

	test.each([0, -1, 1.5, Number.NaN])("perPage が %s ならエラー", (perPage) => {
		expect(() => paginate({ items: [1], perPage })).toThrow("perPage");
	});
});

describe("getPageHref", () => {
	test("1 ページ目は basePath そのもの", () => {
		expect(getPageHref({ basePath: "/posts", page: 1 })).toBe("/posts");
	});

	test("2 ページ目以降は /page/<番号> を付ける", () => {
		expect(getPageHref({ basePath: "/memos", page: 3 })).toBe("/memos/page/3");
	});
});

describe("getRestPageStaticPaths", () => {
	test("2 ページ目以降だけを返す（/page/1 は作らない）", () => {
		const pages = paginate({ items: range({ length: 45 }), perPage: 20 });

		const paths = getRestPageStaticPaths({ pages });

		expect(paths.map(({ params }) => params.page)).toEqual(["2", "3"]);
		expect(paths[0]?.props.page).toBe(pages[1]);
	});

	test("1 ページだけなら空", () => {
		const pages = paginate({ items: range({ length: 3 }), perPage: 20 });

		expect(getRestPageStaticPaths({ pages })).toEqual([]);
	});
});
