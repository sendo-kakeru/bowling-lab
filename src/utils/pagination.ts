/** 一覧の 1 ページぶん */
export interface Page<T> {
	/** 1 始まり */
	page: number;
	pageCount: number;
	items: T[];
}

/**
 * 一覧をページに分ける。0 件でも 1 ページ目は返す（空の一覧を出すため）
 */
export function paginate<T>({
	items,
	perPage,
}: {
	items: readonly T[];
	perPage: number;
}): [Page<T>, ...Page<T>[]] {
	if (!Number.isInteger(perPage) || perPage < 1) {
		throw new Error(`perPage は 1 以上の整数にする: ${perPage}`);
	}

	const pageCount = Math.max(1, Math.ceil(items.length / perPage));
	const toPage = ({ page }: { page: number }): Page<T> => ({
		items: items.slice((page - 1) * perPage, page * perPage),
		page,
		pageCount,
	});

	const rest: Page<T>[] = [];
	for (let page = 2; page <= pageCount; page++) {
		rest.push(toPage({ page }));
	}
	return [toPage({ page: 1 }), ...rest];
}

/**
 * ページの URL。1 ページ目は basePath そのもの、2 ページ目以降は `<basePath>/page/<番号>`。
 * `/page/1` は作らない（同じ内容の URL を 2 つ持たないため）
 */
export function getPageHref({
	basePath,
	page,
}: {
	basePath: string;
	page: number;
}): string {
	return page === 1 ? basePath : `${basePath}/page/${page}`;
}

/**
 * `page/[page].astro` の getStaticPaths が返す値。2 ページ目以降だけを返す
 * （1 ページ目は `index.astro` が出す）
 */
export function getRestPageStaticPaths<T>({
	pages,
}: {
	pages: readonly Page<T>[];
}): { params: { page: string }; props: { page: Page<T> } }[] {
	return pages
		.filter(({ page }) => page > 1)
		.map((page) => ({
			params: { page: String(page.page) },
			props: { page },
		}));
}
