import type { APIRoute, GetStaticPaths, InferGetStaticPropsType } from "astro";
import { getPosts } from "../../../lib/content/get-posts";
import { ballColorForSlug } from "../../../lib/media/thumbnail";
import { renderPostOgp } from "../../../lib/ogp/ogp";

export const getStaticPaths = (async () => {
	const posts = await getPosts();
	return posts.map((post) => ({
		params: { slug: post.slug },
		props: { post },
	}));
}) satisfies GetStaticPaths;

type Props = InferGetStaticPropsType<typeof getStaticPaths>;

export const GET: APIRoute<Props> = async ({ props: { post } }) => {
	const png = await renderPostOgp({
		color: ballColorForSlug({ slug: post.slug }),
		publishedAt: post.publishedAt,
		title: post.title,
	});
	return new Response(png, { headers: { "Content-Type": "image/png" } });
};
