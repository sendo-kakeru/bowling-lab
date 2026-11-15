import { getEntry, render } from "astro:content";
import { type PageData, parsePageData } from "./page-schema";

interface Page {
	data: PageData;
	Content: Awaited<ReturnType<typeof render>>["Content"];
}

/** 固定ページを 1 件読み、フロントマターを検証して本文と一緒に返す */
export async function getPage({ id }: { id: string }): Promise<Page> {
	const entry = await getEntry("pages", id);
	if (!entry) {
		throw new Error(`src/content/pages/${id}.md が見つからない`);
	}

	const data = parsePageData({ data: entry.data, id });
	const { Content } = await render(entry);
	return { Content, data };
}
