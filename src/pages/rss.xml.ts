import rss from "@astrojs/rss";
import type { APIRoute } from "astro";
import { SITE_TAGLINE, SITE_TITLE } from "../consts";
import { getPosts } from "../utils/get-posts";

/** 記事だけを出す。メモは入れない（docs/design/content.md の「作らないもの」） */
export const GET: APIRoute = async ({ site }) => {
	if (!site) throw new Error("astro.config の site が要る");
	const posts = await getPosts();
	return rss({
		description: SITE_TAGLINE,
		items: posts.map((post) => ({
			description: post.description,
			link: `/posts/${post.slug}`,
			pubDate: post.publishedAt,
			title: post.title,
		})),
		site,
		title: SITE_TITLE,
		trailingSlash: false,
	});
};
