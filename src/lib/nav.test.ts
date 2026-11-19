import { describe, expect, it } from "vitest";
import { MAIN_NAV, withCurrent } from "./nav";

function currentOf({ url, path }: { url: string; path: string }) {
	const [link] = withCurrent({
		links: [{ label: "Link", url }],
		page: new URL(path, "https://example.com"),
	});
	return link?.current;
}

describe("withCurrent", () => {
	it.each([
		{ path: "/posts", url: "/posts" },
		{ path: "/posts/", url: "/posts" },
		{ path: "/posts", url: "/posts/" },
		{ path: "/", url: "/" },
		{ path: "/posts?page=2", url: "/posts" },
	])("$path で $url は今のページ", ({ url, path }) => {
		expect(currentOf({ path, url })).toBe("page");
	});

	it.each([
		{ path: "/posts/hello", url: "/posts" },
		{ path: "/posts/hello", url: "/posts/" },
	])("$path で $url は親の区分", ({ url, path }) => {
		expect(currentOf({ path, url })).toBe("true");
	});

	it.each([
		{ path: "/posts", url: "/", why: "ホームは親の区分にならない" },
		{
			path: "/posts",
			url: "/post",
			why: "パスの先頭が同じだけでは区分にならない",
		},
	])("現在地にならない: $why", ({ url, path }) => {
		expect(currentOf({ path, url })).toBeUndefined();
	});

	it("記事の詳細では Posts だけが親の区分になる", () => {
		const links = withCurrent({
			links: MAIN_NAV,
			page: new URL("https://example.com/posts/hello"),
		});
		expect(links.map(({ label, current }) => [label, current])).toEqual([
			["Home", undefined],
			["Posts", "true"],
			["Memo", undefined],
			["About", undefined],
		]);
	});
});
