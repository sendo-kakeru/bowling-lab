import { getEntry, render } from "astro:content";
import { type PageData, type PageId, parsePageData } from "./page-schema";

interface Page<Id extends PageId> {
	data: PageData<Id>;
	Content: Awaited<ReturnType<typeof render>>["Content"];
}

/** 固定ページを 1 件読み、フロントマターを検証して本文と一緒に返す */
export async function getPage<Id extends PageId>({
	id,
}: {
	id: Id;
}): Promise<Page<Id>> {
	const entry = await getEntry("pages", id);
	if (!entry) {
		throw new Error(`src/content/pages/${id}.md が見つからない`);
	}

	const data = parsePageData({ data: entry.data, id });
	const { Content } = await render(entry);
	return { Content, data };
}
