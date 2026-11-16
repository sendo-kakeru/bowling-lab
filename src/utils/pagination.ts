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
	// 末尾のスラッシュを残すと "/posts//page/2" になり、"/" だと "//page/2"（別のホストへのリンク）になる
	const base = basePath.replace(/\/+$/, "");
	if (page === 1) return base === "" ? "/" : base;
	return `${base}/page/${page}`;
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

/**
 * 一度に並べる番号の数（GAP を含む）。最初と最後、今のページと前後 1 つずつ、省いた場所 2 つで 7。
 * 数を変えずに並べるので、ページを移っても矢印の位置が動かない
 */
const MAX_FRAMES = 7;

/** 省いた番号の場所 */
export const GAP = "gap";

/**
 * ページ送りに並べる番号。MAX_FRAMES を超えるときは最初と最後のページ、今のページと前後 1 つずつを残し、
 * 間を GAP で省く。例: [1, 2, 3, 4, 5, GAP, 12]、[1, GAP, 5, 6, 7, GAP, 12]、[1, GAP, 8, 9, 10, 11, 12]
 */
export function getFrameItems({
	current,
	pageCount,
}: {
	current: number;
	pageCount: number;
}): (number | typeof GAP)[] {
	if (pageCount <= MAX_FRAMES) return range({ from: 1, to: pageCount });
	// 端に近いときは、省く場所を 1 つにしてその分の番号を並べる
	const edge = MAX_FRAMES - 2;
	if (current < edge) return [...range({ from: 1, to: edge }), GAP, pageCount];
	if (current > pageCount - edge + 1) {
		return [1, GAP, ...range({ from: pageCount - edge + 1, to: pageCount })];
	}
	return [1, GAP, current - 1, current, current + 1, GAP, pageCount];
}

function range({ from, to }: { from: number; to: number }): number[] {
	return Array.from({ length: to - from + 1 }, (_, i) => from + i);
}
