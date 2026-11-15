import { describe, expect, test } from "vitest";
import { toPublicPath } from "./url.ts";

describe("toPublicPath", () => {
	test.each([
		["/index.html", "/"],
		["/", "/"],
		["/posts.html", "/posts"],
		["/posts", "/posts"],
		["/posts/", "/posts"],
		["/posts/page/2.html", "/posts/page/2"],
		["/posts/index.html", "/posts"],
		["/posts/html-basics.html", "/posts/html-basics"],
		["/posts/index-of-pins", "/posts/index-of-pins"],
	])("%s は %s にする", (pathname, expected) => {
		expect(toPublicPath({ pathname })).toBe(expected);
	});
});
