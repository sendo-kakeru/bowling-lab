import { type CollectionEntry, getCollection } from "astro:content";
import { readFile } from "node:fs/promises";
import * as v from "valibot";
import { decideThumbnail, parseMediaRef, type Thumbnail } from "./media";
import { getMediaManifest } from "./media-manifest";
import {
	comparePosts,
	getExcerpt,
	getToc,
	PostFrontmatterSchema,
	type PostSlug,
	parsePostSlug,
	readPublishedAtSource,
	type TocItem,
} from "./post";

export interface Post {
	slug: PostSlug;
	isDraft: boolean;
	title: string;
	/** フロントマターの description。省いたときは本文の抜粋。本文に文がなければない */
	description?: string;
	publishedAt: Date;
	thumbnail: Thumbnail;
	/** 見出しが少ない記事では空 */
	toc: TocItem[];
	/** 本文を描画するときに render() に渡す */
	entry: CollectionEntry<"posts">;
}

// Astro は MarkdownHeading[] と宣言しているが、索引シグネチャに負けて unknown として届くので、ここで形を確かめる
const HeadingsSchema = v.array(
	v.object({ depth: v.number(), slug: v.string(), text: v.string() }),
);

/** 本番では下書きを検証せずに除く。書きかけのフロントマターでビルドを落とさないため */
async function toPost({
	entry,
}: {
	entry: CollectionEntry<"posts">;
}): Promise<Post | undefined> {
	const { filePath } = entry;
	if (!filePath || !entry.rendered) {
		throw new Error(`記事のファイルを読めない: ${entry.id}`);
	}
	const { slug, isDraft } = parsePostSlug({ filePath });
	if (isDraft && import.meta.env.PROD) return undefined;

	const source = await readFile(filePath, "utf8");
	const result = v.safeParse(PostFrontmatterSchema, {
		...entry.data,
		publishedAt: readPublishedAtSource({ source }) ?? entry.data.publishedAt,
	});
	if (!result.success) {
		throw new Error(
			`記事のフロントマターが正しくない: ${filePath}\n${v.summarize(result.issues)}`,
		);
	}
	const { title, description, publishedAt, thumbnail } = result.output;
	const { html, metadata } = entry.rendered;
	let decided: Thumbnail;
	try {
		decided = decideThumbnail({
			manifest: getMediaManifest(),
			markdown: entry.body ?? "",
			thumbnail: thumbnail && parseMediaRef({ url: thumbnail }),
		});
	} catch (error) {
		const message = error instanceof Error ? error.message : String(error);
		throw new Error(`${filePath}: ${message}`, { cause: error });
	}

	return {
		description: description ?? (getExcerpt({ html }) || undefined),
		entry,
		isDraft,
		publishedAt,
		slug,
		thumbnail: decided,
		title,
		toc: getToc({
			headings: v.parse(HeadingsSchema, metadata?.headings ?? []),
		}),
	};
}

/** 記事を新しい順に返す。下書きは開発サーバーでだけ含める */
export async function getPosts(): Promise<Post[]> {
	const entries = await getCollection("posts");
	const posts = await Promise.all(entries.map((entry) => toPost({ entry })));
	return posts.filter((post) => post !== undefined).toSorted(comparePosts);
}
