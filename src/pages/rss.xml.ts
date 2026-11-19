import rss from "@astrojs/rss";
import type { APIRoute } from "astro";
import { SITE_TAGLINE, SITE_TITLE } from "../consts";
import { getPosts } from "../lib/get-posts";

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
