import type { APIRoute } from "astro";
import { renderSiteOgp } from "../../lib/ogp";

export const GET: APIRoute = async () =>
	new Response(await renderSiteOgp(), {
		headers: { "Content-Type": "image/png" },
	});
