import { describe, expect, test } from "vitest";
import {
	GAP,
	getFrameItems,
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

	test.each([
		["/posts/", 1, "/posts"],
		["/posts/", 2, "/posts/page/2"],
		["/", 1, "/"],
		["/", 2, "/page/2"],
	])(
		"basePath が %s、%i ページ目なら %s（スラッシュを重ねない）",
		(basePath, page, expected) => {
			expect(getPageHref({ basePath, page })).toBe(expected);
		},
	);
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

describe("getFrameItems", () => {
	test.each([
		{ current: 1, expected: [1], pageCount: 1 },
		{ current: 4, expected: [1, 2, 3, 4, 5, 6, 7], pageCount: 7 },
	])(
		"$pageCount ページまでは全部並べる",
		({ current, pageCount, expected }) => {
			expect(getFrameItems({ current, pageCount })).toEqual(expected);
		},
	);

	test.each([
		{ current: 1, expected: [1, 2, 3, 4, 5, GAP, 12] },
		{ current: 4, expected: [1, 2, 3, 4, 5, GAP, 12] },
		{ current: 5, expected: [1, GAP, 4, 5, 6, GAP, 12] },
		{ current: 6, expected: [1, GAP, 5, 6, 7, GAP, 12] },
		{ current: 8, expected: [1, GAP, 7, 8, 9, GAP, 12] },
		{ current: 9, expected: [1, GAP, 8, 9, 10, 11, 12] },
		{ current: 12, expected: [1, GAP, 8, 9, 10, 11, 12] },
	])("12 ページの $current ページ目", ({ current, expected }) => {
		const items = getFrameItems({ current, pageCount: 12 });
		expect(items).toEqual(expected);
		expect(items).toContain(current);
	});

	test("どのページでも並べる数は同じで、最初と最後のページを含む", () => {
		for (const pageCount of [8, 9, 12, 30]) {
			for (let current = 1; current <= pageCount; current++) {
				const items = getFrameItems({ current, pageCount });
				expect(items).toHaveLength(7);
				expect(items.at(0)).toBe(1);
				expect(items.at(-1)).toBe(pageCount);
			}
		}
	});
});
