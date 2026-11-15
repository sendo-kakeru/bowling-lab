export interface NavLink {
	label: string;
	url: string;
	current?: "page" | "true";
}

type NavTarget = Omit<NavLink, "current">;

/** ヘッダーとフッターに並べるサイト内のページ */
export const MAIN_NAV = [
	{ label: "Home", url: "/" },
	{ label: "Posts", url: "/posts" },
	{ label: "Memo", url: "/memos" },
	{ label: "About", url: "/about" },
] as const satisfies NavTarget[];

/** ヘッダーで区切りの右に出すリンク */
export const SUB_NAV = [
	{ label: "RSS", url: "/rss.xml" },
] as const satisfies NavTarget[];

export const LEGAL_NAV = [
	{ label: "プライバシーポリシー", url: "/privacy" },
] as const satisfies NavTarget[];

const TRAILING_SLASH = /\/$/;

function trimPath(pathname: string): string {
	return pathname.replace(TRAILING_SLASH, "") || "/";
}

/** 今のページなら "page"、その親の区分（記事の詳細なら Posts）なら "true" */
function navCurrent({
	url,
	pathname,
}: {
	url: string;
	pathname: string;
}): NavLink["current"] {
	const path = trimPath(url);
	const currentPath = trimPath(pathname);
	if (path === currentPath) return "page";
	if (path !== "/" && currentPath.startsWith(`${path}/`)) return "true";
	return undefined;
}

export function withCurrent({
	links,
	page,
}: {
	links: readonly NavTarget[];
	page: URL;
}): NavLink[] {
	return links.map((link) => ({
		...link,
		current: navCurrent({ pathname: page.pathname, url: link.url }),
	}));
}
